/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * This module executes ql scripts
 */

'use strict';

var configLoader = require('./engine/config.js'),
    tableLoader = require('./engine/load.js'),
    routeLoader = require('./engine/load-routes.js'),
    show = require('./engine/show.js'),
    showRoutes = require('./engine/show-routes.js'),
    describe = require('./engine/describe.js'),
    describeRoute = require('./engine/describe-route.js'),
    create = require('./engine/create.js'),
    select = require('./engine/select.js'),
    insert = require('./engine/insert.js'),
    delet = require('./engine/delet.js'),
    _util = require('./engine/util.js'),
    jsonfill = require('./engine/jsonfill.js'),
    eventTypes = require('./engine/event-types.js'),
    LogEmitter = require('./engine/log-emitter.js'),
    winston = require('winston'),
    compiler = require('ql.io-compiler'),
    _ = require('underscore'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    assert = require('assert');

exports.version = require('../package.json').version;

process.on('uncaughtException', function(error) {
    winston.error(error);
})

/**
 * Create a new instance of the engine with global options. Engine inherits from EventEmitter.
 *
 * The following are the options supported.
 *
 * - config: Path to the configuration file.
 * - tables: Path to the directory containing table definition scripts.
 * - routes: Path to the directory containing route scripts.
 *
 */
var Engine = module.exports = function(opts) {
    var self = this;

    // Engine is a LogEmitter.
    LogEmitter.call(this);

    this.setMaxListeners(30);

    opts = opts || {};

    // Wire up loggers
    if(opts.loggerFn) {
        opts.loggerFn.call(null, this);
    }

    // Load stuff
    opts.config = opts.config || {};
    this.config = _.isObject(opts.config) ? opts.config : configLoader.load({
        config: opts.config,
        logEmitter: this});
    this.tables = tableLoader.load({
        tables: opts.tables,
        logEmitter: this,
        config: this.config});
    this.routes = routeLoader.load({
        tables: this.tables,
        routes: opts.routes,
        logEmitter: this});

    // Settings - copy everything except the known few.
    this.settings = {};
    var that = this;
    _.each(opts, function(v, k) {
        if(k !== 'tables' || k !== 'routes' || k !== 'config') {
            that.settings[k] = v;
        }
    });

    // These are transformers for data formats.
    this.xformers = {};
    if(opts.xformers) {
        this.emitEvent('Loading xformers from ' + opts.xformers);
        try {
            this.xformers = require(opts.xformers);
            _.each(this.xformers, function(v, k) {
                if(_.isString(v)) {
                    try {
                        self.xformers[k] = require(process.cwd() + v);
                    }
                    catch(e) {
                        try {
                            self.xformers[k] = require(v);
                        }
                        catch(e) {
                            delete self.xformers[k];
                            self.emitError('Unable to load xformer ' + v);
                        }
                    }
                }
                else {
                    delete self.xformers[k];
                }
            })
        }
        catch (e) {
            self.emitError('Unable to load xformers from ' + opts.xformers);
        }
    }
    this.xformers['xml'] = require('./xformers/xml.js');
    this.xformers['json'] = require('./xformers/json.js');
    this.xformers['csv'] = require('./xformers/csv.js');

    // Serializers for bodies
    this.serializers = {
        'uri-encoded' : require('./serializers/uri-encoded.js'),
        'mustache' : require('./serializers/mustache.js'),
        'ejs' : require('./serializers/ejs.js')
    }
    this.cache = _util.getCache(this.config, opts.cache, self, function (err) {
        self.emitError('Unable to attach to Cache: ' + JSON.stringify(err, false, null));
    });


}

util.inherits(Engine, LogEmitter);

/**
 * Executes a script. In the generic form, this function takes the following args:
 *
 * * script
 * * options (optional), containing the following
 *   * context: an object containing variables
 *   * parentEvent: no known uses yet - may be dropped in future
 *   * route: route script
 *   * request: containing headers and query params
 * * a function that takes an emitter
 *
 * Here is an example of how to execute a script.
 *
 *     Engine = require('ql.io-engine');
 *     var engine = new Engine({
 *         tables: 'mytabledir',
 *         config: 'path to my config.json'
 *     });
 *     engine.exec('select * from foo', function(emitter) {
 *         emitter.on('end', function(err, results) {
 *              // process err or results
 *         });
 *     });
 */
Engine.prototype.execute = function() {
    var script, opts, func;

    var route, context, cooked, execState, parentEvent,
        request, start = Date.now(), tempResources = {}, last, packet, requestId = '', that = this;

    if(arguments.length === 2) {
        script = arguments[0];
        func = arguments[1];
        opts = {};
    }
    else if(arguments.length === 3) {
        script = arguments[0];
        func = arguments[2];
        opts = arguments[1];
    }
    else {
        assert.ok(false, 'Incorrect arguments');
    }

    opts.script = script;

    // This emitter is used for request-time reporting
    var emitter = new EventEmitter();
    // Let the app register handlers
    func(emitter);

    context = opts.context || {};
    parentEvent = opts.parentEvent;
    route = opts.route;
    request = opts.request || { headers: {}, params: {}, parts: {}};
    if(route) {
        _.extend(context, opts.request.routeParams || {});
    }

    assert.ok(script, 'Missing script');
    assert.ok(this.xformers, 'Missing xformers');

    var engineEvent = this.beginEvent({
        parent: parentEvent,
        name: 'engine',
        message: route ? {'route':  route} : {'script' : script},
        cb: function(err, results) {
            packet = {
                script: route || script,
                type: eventTypes.SCRIPT_DONE,
                elapsed: Date.now() - start,
                data: 'Done'
            };
            if(cooked) {
//                last = _.last(cooked);
                packet.line = cooked.line;
            }
            emitter.emit(eventTypes.SCRIPT_DONE, packet);
            if(results && requestId) {
                results.headers = results.headers || {};
                var name = that.settings['request-id'] ? that.settings['request-id'] : 'request-id';
                results.headers[name] = requestId;
            }
            emitter.emit('end', err, results);
        }
    });

    emitter.emit(eventTypes.SCRIPT_ACK, {
        type: eventTypes.SCRIPT_ACK,
        data: 'Got it'
    });
    try {
        // We don't cache here since the parser does the caching.
        cooked = route ? script : compiler.compile(script);
//        var util = require('util');
//        console.log(util.inspect(cooked, false, 10));
    }
    catch(err) {
        emitter.emit(eventTypes.SCRIPT_COMPILE_ERROR, {
            type: eventTypes.SCRIPT_COMPILE_ERROR,
            data: err
        });
        return engineEvent.end(err);
    }

    emitter.on(eventTypes.REQUEST_ID_RECEIVED, function (reqId) {
        if (reqId) {
            requestId += (reqId + ']');
        }
    });


    //
    // look for the return statement
    //    	if not found return error
    //    	if found, look for dependencies
    //    		for each dependency, execute it with a listener
    //    		once pending listeners are done, continue by returning
    //
    //    	for each statement, look for dependencies,
    //    		for each dependency, execute it with a listener
    //    		once pending listeners are done,
    //    			execute the statement
    //    			if fails, execute the fallback statement with a listener
    //    			if success, continue by calling back

    // Initialize the exec state
    var execState = {};
    function init(statement) {
        execState[statement.id.toString()] = {
            state: eventTypes.STATEMENT_WAITING,
            deps: {}
        };
        _.each(statement.dependsOn, function(dependency) {
            init(dependency);
        });
        if(statement.fallback) {
            _.each(statement.fallback.dependsOn, function(dependency) {
                init(dependency);
            })
        }
    }
    init(cooked);

    //
    // Start with the return statement
    //
    // For each statement
    //      dep_count = {};
    //      for each dependency
    //          if state === waiting, fire it off, dep_count.id, with listener
    //              on completion,
    //                  delete dep_count.id;
    //                  if dep_count ==== 0
    //                      call the listener
    //                  else
    //                      nothing
    //          if state === in_flight, dep_count++,
    //              if already listening, nothing
    //              if nor, add listener
    //                  on completion same as above
    //
    function run(statement, fn) {
        _.each(statement.dependsOn, function(dependency) {
            switch(execState[dependency.id.toString()].state) {
                case eventTypes.STATEMENT_WAITING:
                    execState[statement.id.toString()].deps[dependency.id.toString()] = dependency;
                    run(dependency, function(err, results) {
                        delete execState[statement.id.toString()].deps[dependency.id.toString()];
                        execState[dependency.id.toString()].state = err ? eventTypes.STATEMENT_ERROR : eventTypes.STATEMENT_SUCCESS;
                        run(statement, fn);
                    })
                    break;
                case eventTypes.STATEMENT_IN_FLIGHT:
                    // Already in progress.
                    break;
            }
        });
        if(_.isEmpty(execState[statement.id.toString()].deps) && execState[statement.id.toString()].state !== eventTypes.STATEMENT_IN_FLIGHT) {
            execOne({tables: that.tables,
                     routes: that.routes,
                     config: that.config,
                     settings: that.settings,
                     xformers: that.xformers,
                     serializers: that.serializers,
                     tempResources: tempResources,
                     context: context,
                     request: request,
                     emitter: emitter,
                     logEmitter: that,
                     cache: that.cache
                     },
                statement, function(err, results) {
                    console.log(err)
                    fn.call(null, err, results);
                }, engineEvent);
        }
    }

    var util = require('util');
//    console.log(execState);
//    console.log(util.inspect(cooked, false, 10));
    run(cooked, function(err, results) {
        engineEvent.end(err, results);
    });

//    try {
//        if(cooked.length > 1) {
//            // Pass 3: Create the execution tree. The execution tree consists of forks and joins.
//            execState = {};
//            _.each(cooked, function(line) {
//                if(line.type !== 'comment') {
//                    execState[line.id.toString()] = {
//                        state: eventTypes.STATEMENT_WAITING,
//                        waits: line.dependsOn ? line.dependsOn.length : 0};
//                }
//            });
//
//            if (!_.isEmpty(execState)) {
//                // Sweep the statements till we're done.
//                var sweepCounter = 0;
//                try {
//                    sweep({
//                        cooked: cooked,
//                        execState: execState,
//                        sweepCounter: sweepCounter,
//                        tables: this.tables,
//                        routes: this.routes,
//                        settings: this.settings,
//                        config: this.config,
//                        xformers: this.xformers,
//                        serializers: this.serializers,
//                        tempResources: tempResources,
//                        context: context,
//                        request: request,
//                        logEmitter: this,
//                        emitter: emitter,
//                        start: start,
//                        cache: this.cache
//                    }, engineEvent);
//                }
//                catch (err) {
//                    return engineEvent.end(err);
//                }
//            }
//        }
//        else {
//            execOne({
//                tables: this.tables,
//                routes: this.routes,
//                config: this.config,
//                settings: this.settings,
//                xformers: this.xformers,
//                serializers: this.serializers,
//                tempResources: tempResources,
//                context: context,
//                request: request,
//                emitter: emitter,
//                logEmitter: this,
//                cache: this.cache
//            }, cooked[0], function(err, results) {
//                return engineEvent.end(err, results);
//            }, engineEvent);
//        }
//    }
//    catch(err) {
//        return engineEvent.end(err);
//    }
}

/**
 * Executes a script.
 *
 * @deprecated Use execute instead.
 */
Engine.prototype.exec = function() {
    var opts, script, cb, events, listeners;

    // Two args: (1) the script, (2) a callback that expects an err or result
    if(arguments.length === 2 && _.isString(arguments[0]) && _.isFunction(arguments[1])) {
        script = arguments[0];
        cb = arguments[1];
        this.execute(script, function(emitter) {
            emitter.on('end', function(err, results) {
                cb(err, results);
            });
        })
    }
    // One args: An opts that takes several properties
    else if(arguments.length === 1) {
        opts = arguments[0];
        script = opts.script;
        cb = opts.cb;
        this.execute(script, opts, function(emitter) {

            // For backwards compat sake, we need to copy the listeners from the supplied emitter
            // to "this"
            if(opts.emitter) {
                events = ['ack', 'compile-error', 'statement-error', 'statement-in-flight',
                        'statement-success', 'statement-request', 'statement-response', 'script-done'];
                _.each(events, function(event) {
                    listeners = opts.emitter.listeners(event);
                    _.each(listeners, function(listener) {
                        emitter.on(event, listener);
                    })
                })
            }

            // Results
            emitter.on('end', function(err, results) {
                cb(err, results);
            });
        })
    }
    else {
        assert.ok(false, 'Incorrect arguments');
    }
};

/**
 * Specify a transformer for response data.
 *
 * @param type
 * @param xformer
 */
Engine.prototype.use = function(type, xformer) {
    this.xformers[type] = xformer;
}

/**
 * This function recursively executes statements until the dependencies for the return statement
 * are met.
 *
 * Precondition: opts.cooked must have at least one executable statement
 *
 * @ignore
 * @param opts
 */
function sweep(opts, parentEvent) {
    if(opts.done) {
        return;
    }
    opts.sweepCounter++;
    var pending = 0, skip = false, last, state, id;
    _.each(opts.cooked, function(line) {
        if(line.type !== 'comment') {
            id = line.id;
            state = opts.execState[id];
            if(state.state === eventTypes.STATEMENT_WAITING && state.waits == 0 && line.type !==
                'return') {
                pending++;
                state.state = eventTypes.STATEMENT_IN_FLIGHT;
                var step = function (line, state) {
                    execOne(opts, line, function(err, result) {
                        if(err) {
                            // Skip the remaining statements and return error
                            skip = true;
                            return parentEvent.end(err);
                        }
                        opts.latest = line;
                        opts.latestResult = result;

                        state.state = err ? eventTypes.STATEMENT_ERROR : eventTypes.STATEMENT_SUCCESS;
                        pending--;
                        _.each(line.listeners, function(listener) {
                            --opts.execState[listener].waits;
                        });

                        sweep(opts, parentEvent);
                    }, parentEvent);
                }
                // TODO: Execute only if there are dependencies
                step(line, state);
            }
            else if(state.state == eventTypes.STATEMENT_IN_FLIGHT) {
                // This line is in-flight.
                pending++;
            }
            // remember the last executable statement
            last = line;
        }
    });

    state = opts.execState[last.id];
    if(pending === 0 && state.waits > 0 && last.type === 'return') {
        return parentEvent.end('Script has unmet dependencies. The return statement depends on one/more other ' +
                'statement(s), but those are not in-progress.');
    }
    if(pending == 0 && state.waits == 0) {
        if(last.type === 'return') {
            if(state.state === eventTypes.STATEMENT_WAITING) {
                opts.execState[last.id].state = eventTypes.STATEMENT_IN_FLIGHT;
                execOne(opts, last, function(err, results) {
                    opts.execState[last.id].state = err ? eventTypes.STATEMENT_ERROR : eventTypes.STATEMENT_SUCCESS;
                    return parentEvent.end(err, results);
                }, parentEvent);
            }
        }
        // Single statement (sans create/comments) - return the last result
        else {
            opts.done = true;
            return parentEvent.end(null, opts.latestResult);
        }
    }
}

function execOne(opts, statement, cb, parentEvent) {
    var packet = {
        line: statement.line,
        type: eventTypes.STATEMENT_IN_FLIGHT
    };
    var start = Date.now();
    if(opts.emitter) {
        opts.emitter.emit(eventTypes.STATEMENT_IN_FLIGHT, packet);
    }

    try {
        _execOne(opts, statement, parentEvent, function(err, results) {
            if(opts.emitter) {
                packet.elapsed = Date.now() - start;
                packet.type = err ? eventTypes.STATEMENT_ERROR : eventTypes.STATEMENT_SUCCESS;
                opts.emitter.emit(packet.type, packet);
            }
            return cb(err, results);
        });
    }
    catch(e) {
        console.log(e.stack || e);
        if(opts.emitter) {
            packet.elapsed = Date.now() - start;
            packet.type = eventTypes.STATEMENT_ERROR;
            opts.emitter.emit(packet.type, packet);
        }
        return cb(e);
    }
}
/**
 * Exec one statement
 *
 * @param opts args
 * @param statement
 * @param cb
 * @ignore
 */
function _execOne(opts, statement, parentEvent, cb) {
    var obj;
    switch(statement.type) {
        case 'create' :
            create.exec(opts, statement, parentEvent, cb);
            break;
        case 'define' :
            var params = _util.prepareParams(opts.context,
                    opts.request.body,
                    opts.request.routeParams,
                    opts.request.params,
                    opts.request.headers,
                    opts.request.connection,
                    {config: opts.config});

            if(statement.hasOwnProperty('object')) {
                obj = jsonfill.fill(statement.object, params);
            }
            else if(statement.udf) {
                var args = [];
                _.each(_.pluck(statement.args, 'value'), function(arg) {
                    args.push(jsonfill.lookup(arg, opts.context));
                });
                try {
                    obj = require('./udfs/standard.js')[statement.udf].apply(null, args);
                }
                catch(e) {
                    console.log(e.stack || e);
                    return cb(e);
                }
            }

            opts.context[statement.assign] = obj;
            opts.emitter.emit(statement.assign, obj)
            cb(undefined, opts.context);
            break;
        case 'select' :
            select.exec(opts, statement, parentEvent, cb);
            break;
        case 'insert' :
            insert.exec(opts, statement, parentEvent, cb);
            break;
        case 'delete' :
            delet.exec(opts, statement, parentEvent, cb);
            break;
        case 'show' :
            show.exec(opts, statement, parentEvent, cb);
            break;
        case 'show routes' :
            showRoutes.exec(opts, statement, parentEvent, cb);
            break;
        case 'describe':
            describe.exec(opts, statement, parentEvent, cb);
            break;
        case 'describe route':
            describeRoute.exec(opts, statement, parentEvent, cb);
            break;
        case 'return':
            //
            // TODO: This code needs to refactored when the result is a statement, along with
            // selects in  'in' clauses. Such statements should be scheduled sooner. What we have
            // here below is sub-optimal.

            // If the return is via a route, process any headers from 'using headers' clause
            var respHeaders = {};
            if(statement.route && statement.route.headers) {
                var params = _util.prepareParams(opts.context,
                    opts.request.body,
                    opts.request.routeParams,
                    opts.request.params,
                    opts.request.headers,
                    opts.request.connection,
                    {config: opts.config});
                _.each(statement.route.headers, function(value, name) {
                    // Fill name and value
                    var _name = jsonfill.fill(name, params);
                    respHeaders[_name] = jsonfill.fill(value, params);
                });
            }

            // lhs can be a reference to an object in the context or a JS object.
            switch(statement.rhs.type) {
                case 'create':
                case 'select':
                case 'insert':
                case 'delete':
                case 'show':
                case 'show routes':
                case 'describe':
                case 'describe route':
                    _execOne(opts, statement.rhs, parentEvent, _routeRespHeaders(respHeaders, cb));
                    break;
                default:
//
//            if(statement.rhs.type === 'select') {
//                select.exec(opts, statement.rhs, parentEvent, _routeRespHeaders(respHeaders, cb));
//            }
//            else if(statement.rhs.type === 'insert') {
//                insert.exec(opts, statement.rhs, parentEvent, _routeRespHeaders(respHeaders, cb));
//            }
//            else if(statement.rhs.type === 'describe') {
//                describe.exec(opts, statement.rhs, cb);
//            }
//            else if(statement.rhs.type === 'delete') {
//                delet.exec(opts, statement.rhs, parentEvent, _routeRespHeaders(respHeaders, cb));
//            }
//            else {
                var params = _util.prepareParams(opts.context,
                    opts.request.body,
                    opts.request.routeParams,
                    opts.request.params,
                    opts.request.headers,
                    opts.request.connection,
                    {config: opts.config});
                if(statement.rhs.ref) {
                    obj = opts.context[statement.rhs.ref];
                    if(_.isNull(obj)) {
                        cb('Unresolved reference in return');
                    }
                }
                if(statement.rhs.hasOwnProperty('object')) {
                    obj = jsonfill.fill(statement.rhs.object, params);
                }
                else if(statement.rhs.udf) {
                    var args = [];
                    _.each(_.pluck(statement.rhs.args, 'value'), function(arg) {
                        args.push(jsonfill.lookup(arg, opts.context));
                    });
                    obj = require('./udfs/standard.js')[statement.rhs.udf].apply(null, args);
                }

                respHeaders['content-type'] = 'application/json';
                var ret = {
                    body: obj,
                    headers: respHeaders
                };
                cb(undefined, ret);
                    break;
            }
    }
}

function _routeRespHeaders(respHeaders, cb) {
    return function(err, res) {
        if(err) {
            cb(err);
        }
        else {
            _.each(respHeaders, function(value, name) {
                res.headers[name] = value;
            });
            cb(undefined, res);
        }
    }
}

// Export event types
Engine.Events = {};
_.extend(Engine.Events, eventTypes);
