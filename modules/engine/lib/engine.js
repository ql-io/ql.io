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
    update = require('./engine/update.js'),
    ifelse = require('./engine/ifelse.js'),
    trycatch = require('./engine/trycatch.js'),
    logic = require('./engine/logic.js'),
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
    console.log(error.stack || error);
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

    this.debugData = {
        max : 1
    };

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

    var route, context, plan, parentEvent,
        request, start = Date.now(), tempResources = {}, packet, requestId = '', that = this;

    //for debug
    var emitterID, unexecuted, step1, timeoutID;
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
    else if(arguments.length === 4) {
        // debug mode
        script = arguments[0];
        func = arguments[2];
        opts = arguments[1];
        // only assign emitterID in debug mode.
        emitterID = that.debugData.max++;
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
            if(plan) {
                packet.line = plan.line;
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
        plan = route ? script : compiler.compile(script);
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
    if (emitterID) {
        emitter.on(eventTypes.DEBUG_STEP, function (){
            execOneStatement(unexecuted.shift());
        });
        emitter.on(eventTypes.KILL, function (){
            delete that.debugData[emitterID];
            clearTimeout(timeoutID);
            engineEvent.end(null, null);
        });
        that.debugData[emitterID] = emitter;
        unexecuted = [];
        step1 = true;
        timeoutID = setTimeout( function () {
            emitter.emit(eventTypes.KILL);
        }, 1800000);// clear unused session in 30 minutes.
    }

    // Initialize the exec state
    var execState = {};
    function init(statement) {
        function scopeInit(statement) {
            switch(statement.type){
                case 'if':
                    init(statement.condition);
                    _.each(statement.if, function(line){
                        init(line);
                    });
                    _.each(statement.else, function(line){
                        init(line);
                    });
                    break;
                case 'try':
                    _.each(statement.dependsOn, function(line){
                        init(line);
                    });
                    _.each(statement.catchClause, function(currentcatch){
                        _.each(currentcatch.lines, function(line){
                            init(line);
                        });
                    });
                    if(statement.finallyClause) {
                        _.each(line.finallyClause, function(line){
                            init(line);
                        });
                    }
                    break;
            }
        }
        if(execState[statement.id]) {
            return;
        }
        execState[statement.id] = {
            state: eventTypes.STATEMENT_WAITING,
            count: statement.dependsOn ? statement.dependsOn.length : 0
        };
        _.each(statement.dependsOn, function(dependency) {
            init(dependency);
        });
        var fallback = statement.rhs ? statement.rhs.fallback : statement.fallback;
        if(fallback) {
            init(fallback);
        }
        if (statement.scope) {
            init(statement.scope);
        }
        scopeInit(statement);
    }
    init(plan.rhs);

    /* Skip assign statement. Make it undefined, and trigger listener
     */
    function skipVar(statement){
        context[statement.assign] = undefined;
        execState[statement.id].state = eventTypes.STATEMENT_SUCCESS;
        _.each(statement.listeners, function(listener) {
            execState[listener.id].count--;
            if (!(listener.fbhold)){
                sweep(listener);
            }
        });
    }

    // scope is complex to execute, handle separately
    function execScope(statement, arg) {
        switch(statement.type) {
            case 'if' :
                var toskip = arg.skip,
                    toexec = arg.exec;
                _.each(toskip, function(st) {
                    skipVar(st);
                });
                _.each(toexec, function(st) {
                    sweep(st);
                })
                break;
            case 'try':
                //arg is a 1:1 mapping to catchClause, only execute the ones that are true
                var catchzip = _.zip(arg, statement.catchClause)
                _.each(catchzip, function(mycatch) {
                    if(mycatch[0]){
                        _.each(mycatch[1].lines, function(line){
                            sweep(line);
                        });
                    }else{
                        _.each(mycatch[1].lines, function(line){
                            skipVar(line);
                        });
                    }
                });
                break;
        }
    }

    var skip = false;
    function sweep(statement) {
        if(skip) {
            return;
        }
        _.each(statement.dependsOn, function(dependency) {
            if(execState[dependency.id].state === eventTypes.STATEMENT_WAITING) {
                // Exec the dependency
                sweep(dependency);
            }
        });
        if(statement.scope && execState[statement.scope.id].state === eventTypes.STATEMENT_WAITING) {
            sweep(statement.scope);
        }
        if(statement.rhs) {
            _.each(statement.rhs.dependsOn, function(dependency) {
                if(execState[dependency.id].state === eventTypes.STATEMENT_WAITING) {
                    // Exec the dependency
                    sweep(dependency);
                }
            });
            if(statement.rhs.scope && execState[statement.rhs.scope.id].state === eventTypes.STATEMENT_WAITING) {
                sweep(statement.rhs.scope);
            }
        }

        var todo = statement.rhs || statement,
            scopeDone = !todo.scope || execState[todo.scope.id].state === eventTypes.STATEMENT_SUCCESS;
        if(execState[todo.id].state === eventTypes.STATEMENT_WAITING &&  // Don't try if in-flight
            execState[todo.id].count === 0 &&
            scopeDone) {
            execState[todo.id].state = eventTypes.STATEMENT_IN_FLIGHT;
            if (emitterID && !step1) {
                // only used for debugger
                unexecuted.push(statement);
            }
            else {
                if (step1) {
                    // execute the first step in debugging mode without pause.
                    step1 = false;
                }
                execOneStatement(statement);
            }
        }
    }

    var execOneStatement = function(statement) {
        if (!statement) {
            return;
        }
        var todo = statement.rhs || statement;
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
            todo, function(err, results) {
                if(err) {
                    if(todo.fallback) {
                        todo.fallback.fbhold = false;
                        return sweep(todo.fallback);
                    }
                    else {
                        // Skip the remaining statements and return error
                        skip = true;
                        return engineEvent.end(err);
                    }
                }
                else if(results === null || results === undefined
                    || results.body === null || results.body === undefined
                    || todo.type === 'logic' && results === false){
                    var fallback = statement.rhs ? statement.rhs.fallback : statement.fallback;
                    if(fallback) {
                        fallback.fbhold = false;
                        return sweep(fallback);
                    }
                }


                execState[todo.id].state = err ? eventTypes.STATEMENT_ERROR : eventTypes.STATEMENT_SUCCESS;


                if(todo.type === 'if' || todo.type === 'try') {
                    execScope(todo, results);
                }
                _.each(todo.listeners, function(listener) {
                    execState[listener.id].count--;
                    if (!(listener.fbhold)){
                        sweep(listener);
                    }
                });
                if (emitterID && unexecuted.length) {
                    emitter.emit(eventTypes.DEBUG, {
                        context : context,
                        emitterID : emitterID
                    });
                }
                else if(execState[todo.id].done) {
                    execState[todo.id].done.call(null, err, results);
                }
            }, engineEvent.event);
    }

    var fnDone = function(err, results) {
        execState[plan.rhs.id].state = err ? eventTypes.STATEMENT_ERROR : eventTypes.STATEMENT_SUCCESS;

        var respHeaders = {};
        var params;
        if(err) {
            engineEvent.end(err);
        }
        else {
            results = results || {headers:{}, body: null};
            if(plan.route && plan.route.headers) {
                params = _util.prepareParams(context,
                    request.body,
                    request.routeParams,
                    request.params,
                    request.headers,
                    request.connection,
                    {config: that.config});
                _.each(plan.route.headers, function (value, name) {
                    // Fill name and value
                    var _name = jsonfill.fill(name, params);
                    respHeaders[_name] = jsonfill.fill(value, params);
                });
            }
            respHeaders['content-type'] = 'application/json';
            _.each(respHeaders, function(value, name) {
                results.headers[name] = value;
            });
            delete that.debugData[emitterID];
            clearTimeout(timeoutID);
            engineEvent.end(null, results);

        }
    }

    // Start with the return statement
    execState[plan.rhs.id].done = fnDone;
    var next = plan.rhs ? plan.rhs.fallback : plan.fallback;
    while(next) {
        execState[next.id].done = fnDone;
        next = next.fallback;
    }

    sweep(plan);
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
    if(preReqNotFound(statement, opts, parentEvent)) {
        return cb();
    }

    var obj, params, args;
    switch(statement.type) {
        case 'create' :
            create.exec(opts, statement, parentEvent, cb);
            break;
        case 'define' :
            params = _util.prepareParams(opts.context,
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
                args = [];
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
            var ret = {
                body: obj,
                headers: {}
            };
            cb(null, ret);
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
        case 'update' :
            update.exec(opts, statement, parentEvent, cb);
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
        case 'ref':
            obj = opts.context[statement.ref];
            if(_.isNull(obj)) {
                cb('Unresolved reference in return');
            }
            if(statement.hasOwnProperty('object')) {
                obj = jsonfill.fill(statement.object, params);
            }
            cb(null, {
                body: obj,
                headers: {}
            });
            break;
        case 'if':
            ifelse.exec(opts, statement, parentEvent, cb);
            break;
        case 'try':
            trycatch.exec(opts, statement, parentEvent, cb);
            break;
        case 'throw':
            trycatch.throw(opts, statement, parentEvent, cb);
            break;
        case 'logic':
            logic.exec(opts, statement, parentEvent, cb);
            break;
    }
}

function preReqNotFound(statement, opts, parentEvent) {
    return (statement.preRequisites || []).length > 0 && !_.all(statement.preRequisites, function (aVar) {
        var found = opts.context[aVar] != undefined && opts.context[aVar] != null;
        if (!found) {
            opts.logEmitter.emitWarning(parentEvent, "Required parameter not found in context: " + aVar);
        }
        return found;
    });
}

// Export event types
Engine.Events = {};
_.extend(Engine.Events, eventTypes);
