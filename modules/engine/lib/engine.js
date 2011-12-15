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
    describe = require('./engine/describe.js'),
    create = require('./engine/create.js'),
    select = require('./engine/select.js'),
    insert = require('./engine/insert.js'),
    jsonfill = require('./engine/jsonfill.js'),
    eventTypes = require('./engine/event-types.js'),
    httpRequest = require('./engine/http.request.js'),
    logEmitter =  require('./engine/log-emitter.js'),
    winston = require('winston'),
    compiler = require('ql.io-compiler'),
    async = require('async'),
    _ = require('underscore'),
    assert = require('assert'),
    sys = require('sys');

process.on('uncaughtException', function(error) {
    winston.error(error);
})

/**
 * Create a new instance of the engine with global options.
 *
 * The following are the options supported.
 *
 * - config: Path to the configuration file
 *
 * - tables: Path to the directory containing table definition files.
 *
 */
var Engine = module.exports = function(opts) {

    // Holder for global opts.
    global.opts = opts || {};

    // Load config
    global.opts.config = _.isObject(global.opts.config) ? global.opts.config : configLoader.load(global.opts);

    var tablesDir = global.opts ? global.opts.tables : undefined;
    var config = global.opts ? global.opts.config : {};
    var routesDir = global.opts ? global.opts.routes : undefined;

    // Delete tables and routes - this allows engine invocations from inside app modules for
    // monkey patching or auth
    if(global.opts.tables) {
        delete global.opts.tables;
    }
    if(global.opts.routes) {
        delete global.opts.routes;
    }
    var tables = tableLoader.load(tablesDir, config);
    var routes = routeLoader.load(routesDir);

    this.routes = function() {
        return routes;
    }

    var xformers = {
        'xml': require('./xformers/xml.js'),
        'json': require('./xformers/json.js')
    }

    /**
     * Specify a transformer for response data.
     *
     * @param type
     * @param xformer
     */
    this.use = function(type, xformer) {
        xformers[type] = xformer;
    }

    /**
     * Executes the given statement or script.
     */
    this.exec = function() {
        var opts, cb, route, script, context = {}, cooked, execState, parentEvent, emitter,
            request, start = Date.now(), tempResources = {}, last, packet, requestId = '';
        if(arguments.length === 2 && _.isString(arguments[0]) && _.isFunction(arguments[1])) {
            script = arguments[0];
            cb = arguments[1];
            request = {
                headers: {},
                params: {}
            };
        }
        else if(arguments.length === 1) {
            opts = arguments[0];
            cb = opts.cb;
            script = opts.script;
            context = opts.context || {};
            emitter = opts.emitter;
            parentEvent = opts.parentEvent;
            route = opts.route;
            request = opts.request || { headers: {}, params: {}};
            if (route) {
                _.extend(context, opts.request.routeParams || {});
            }
        }
        else {
            assert.ok(false, "Incorrect arguments");
        }

        assert.ok(cb, 'Missing callback');
        assert.ok(script, 'Missing script');
        assert.ok(xformers, 'Missing xformers');

        var engineEvent = logEmitter.wrapEvent(parentEvent, 'QlIoEngine', null, function(err, results) {
            if(emitter) {
                packet = {
                    script: route || script,
                    type: eventTypes.SCRIPT_DONE,
                    elapsed: Date.now() - start,
                    data: 'Done'
                };
                if(cooked) {
                    last = _.last(cooked);
                    packet.line = last.line;
                }
                emitter.emit(eventTypes.SCRIPT_DONE, packet);
            }
            if(results && requestId) {
                results.headers = results.headers || {};
                results.headers['request-id'] = requestId;
            }
            cb(err, results);
        });
        logEmitter.emitEvent(engineEvent.event, route ? 'route:' + route : 'script:' + script);

        if(emitter) {
            emitter.emit(eventTypes.SCRIPT_ACK, {
                type: eventTypes.SCRIPT_ACK,
                data: 'Got it'
            });
        }
        try {
            // We don't cache here since the parser does the caching.
            cooked = route ? script : compiler.compile(script);
            if(emitter) {
                emitter.emit(eventTypes.SCRIPT_COMPILE_OK, {
                    type: eventTypes.SCRIPT_COMPILE_OK,
                    data: 'No compilation errors'
                });
            }
        }
        catch(err) {
            if(emitter) {
                emitter.emit(eventTypes.SCRIPT_COMPILE_ERROR, {
                    type: eventTypes.SCRIPT_COMPILE_ERROR,
                    data: err
                });
            }
            logEmitter.emitError(engineEvent.event, err);
            return engineEvent.cb(err, null);
        }

        if (emitter) {
            emitter.on(eventTypes.REQUEST_ID_RECEIVED, function (reqId) {
                if (reqId) {
                    requestId += (reqId + ']');
                }
            });
        }

        try {
            if(cooked.length > 1) {
                // Pass 3: Create the execution tree. The execution tree consists of forks and joins.
                execState = {};
                _.each(cooked, function(line) {
                    if(line.type !== 'comment') {
                        execState[line.id.toString()] = {
                            state: eventTypes.STATEMENT_WAITING,
                            waits: line.dependsOn ? line.dependsOn.length : 0};
                    }
                });

                if (!_.isEmpty(execState)) {
                    // Sweep the statements till we're done.
                    var sweepCounter = 0;
                    try {
                        sweep({
                            cooked:cooked,
                            execState:execState,
                            sweepCounter:sweepCounter,
                            tables:tables,
                            xformers:xformers,
                            tempResources:tempResources,
                            context:context,
                            request:request,
                            emitter:emitter,
                            start:start,
                            cb:engineEvent.cb
                        });
                    }
                    catch (err) {
                        logEmitter.emitError(engineEvent.event, err);
                        return engineEvent.cb(err, null);
                    }
                }
            }
            else {
                execOne({
                    tables: tables,
                    xformers: xformers,
                    tempResources: tempResources,
                    context: context,
                    request: request,
                    emitter: emitter
                }, cooked[0], function(err, results) {
                    if(err) {
                        logEmitter.emitError(engineEvent.event, err);
                    }
                    return engineEvent.cb(err, results);
                });
            }
        }
        catch(err) {
            logEmitter.emitError(engineEvent.event, err);
            return engineEvent.cb(err, null);
        }
    };
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
function sweep(opts) {
    if(opts.done) {
        return;
    }
    opts.sweepCounter++;
    var pending = 0, skip = false, last, state, id;
    _.each(opts.cooked, function(line) {
        if(line.type !== 'comment') {
            id = line.id;
            state = opts.execState[id];
            if(state.state === eventTypes.STATEMENT_WAITING && state.waits == 0 && line.type !== 'return') {
                pending++;
                state.state = eventTypes.STATEMENT_IN_FLIGHT;
                var step = function (line, state) {
                    execOne(opts, line, function(err, result) {
                        if(err) {
                            // Skip the remaining statements and return error
                            skip = true;
                            return opts.cb(err);
                        }
                        opts.latest = line;
                        opts.latestResult = result;

                        state.state = err ? eventTypes.STATEMENT_ERROR : eventTypes.STATEMENT_SUCCESS;
                        pending--;
                        _.each(line.listeners, function(listener) {
                            --opts.execState[listener].waits;
                        });

                        sweep(opts);
                    });
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
        return opts.cb({
            message: 'Script has unmet dependencies. The return statement depends on one/more other statement(s), but those are not in-progress.'
        });
    }
    if(pending == 0 && state.waits == 0) {
        if(last.type === 'return') {
            if(state.state === eventTypes.STATEMENT_WAITING) {
                opts.execState[last.id].state = eventTypes.STATEMENT_IN_FLIGHT;
                execOne(opts, last, function(err, results) {
                    opts.execState[last.id].state = eventTypes.STATEMENT_SUCCESS;
                    return opts.cb(err, results);
                });
            }
        }
        // Single statement (sans create/comments) - return the last result
        else {
            opts.done = true;
            return opts.cb(undefined, opts.latestResult);
        }
    }
}

function execOne(opts, statement, cb) {
    var packet = {
        line: statement.line,
        type: eventTypes.STATEMENT_IN_FLIGHT
    };
    var start = Date.now();
    if(opts.emitter) {
        opts.emitter.emit(eventTypes.STATEMENT_IN_FLIGHT, packet);
    }

    try {
        _execOne(opts, statement, function(err, results) {
            if(opts.emitter) {
                packet.elapsed = Date.now() - start;
                packet.type = err ? eventTypes.STATEMENT_ERROR : eventTypes.STATEMENT_SUCCESS;
                opts.emitter.emit(packet.type, packet);
            }
            cb(err, results);
        });
    }
    catch(e) {
        if(opts.emitter) {
            packet.elapsed = Date.now() - start;
            packet.type = eventTypes.STATEMENT_ERROR;
            opts.emitter.emit(packet.type, packet);
        }
        cb(e);
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
function _execOne(opts, statement, cb) {
    var lhs, obj;
    switch(statement.type) {
        case 'create' :
            create.exec(opts, statement, cb);
            break;
        case 'define' :
            obj = jsonfill.fill(statement.object,
                httpRequest.prepareParams(opts.context,
                    opts.request.headers,
                    opts.request.params,
                    opts.request.routeParams));

            opts.context[statement.assign] = obj;
            cb(undefined, opts.context);
            break;
        case 'select' :
            select.exec(opts, statement, cb);
            break;
        case 'insert' :
            insert.exec(opts, statement, cb);
            break;
        case 'show' :
            show.exec(opts, statement, cb);
            break;
        case 'describe':
            describe.exec(opts, statement, cb);
            break;
        case 'return':
            //
            // TODO: This code needs to refactored when the result is a statement, along with
            // selects in  'in' clauses. Such statements should be scheduled sooner. What we have
            // here below is sub-optimal.
            // lhs can be a reference to an object in the context or a JS object.
            if(statement.rhs.type === 'select') {
                select.exec(opts, statement.rhs, function(err, result) {
                    if(err) {
                        cb(err);
                    }
                    else {
                        cb(undefined, result);
                    }
                });
            }
            else {
                lhs = statement.rhs.ref ? opts.context[statement.rhs.ref] : statement.rhs.object;
                if(_.isNull(lhs)) {
                    cb({
                        message: 'Unresolved reference in return'
                    })
                }
                else {
                    var ret = {
                        headers: {
                            'content-type': 'application/json'
                        },
                        body: jsonfill.fill(lhs, httpRequest.prepareParams(opts.context,
                            opts.request.headers,
                            opts.request.params,
                            opts.request.routeParams))
                    };
                    cb(undefined, ret);
                }
            }
    }
}

// Export event types
Engine.Events = {};
_.extend(Engine.Events, eventTypes);
