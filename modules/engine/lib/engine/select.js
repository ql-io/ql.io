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

"use strict";

var httpRequest = require('./http.request.js'),
    logEmitter =  require('./log-emitter.js'),
    jsonfill = require('./jsonfill.js'),
    project = require('./project.js'),
    _ = require('underscore'),
    async = require('async'),
    jsonPath = require('JSONPath'),
    assert = require('assert');

exports.exec = function(opts, statement, cb, parentEvent) {

    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(cb, 'Argument cb can not be undefined');
    assert.ok(opts.xformers, 'No xformers set');

    var funcs, cloned, joiningColumn, selectEvent, i;
    selectEvent = logEmitter.wrapEvent(parentEvent, 'QlIoSelect', null, cb);

    execInternal(opts, statement, function(err, results) {
        if(err) {
            return selectEvent.cb(err, results);
        }
        if(statement.joiner) {
            // Do the join now - we fill the joining column in into the joiner statement and execute it one for each
            // row from the main's results.
            joiningColumn = statement.joiner.whereCriteria[0].rhs.joiningColumn;

            // Prepare the joins
            funcs = [];
            _.each(results.body, function(row) {
                // Clone the joiner since we are going to modify it
                cloned = clone(statement.joiner);

                // Set the join field
                cloned.whereCriteria[0].rhs.value = (_.isArray(row) || _.isObject(row)) ? row[joiningColumn] : row;

                funcs.push(function(s) {
                    return function(callback) {
                        execInternal(opts, s, function(e, r) {
                            if(e) {
                                callback(e);
                            }
                            else {
                                callback(null, r.body);
                            }
                        }, selectEvent.event);
                    };
                }(cloned));
            });

            // Execute joins
            async.parallel(funcs, function(err, more) {
                // If there is nothing to loop throough, leave the body undefined.
                var body = results.body ? [] : undefined;
                _.each(results.body, function(row, index) {
                    // If no matching result is found in more, skip this row
                    var other = more[index];
                    if((_.isArray(other) && other.length > 0) || (_.isObject(other) && _.keys(other) > 0)) {
                        // When columns are selected by name, use an object. If not, an array.
                        var sel = statement.selected.length > 0 && statement.selected[0].name ? {} : [];
                        _.each(statement.selected, function(selected) {
                            var val = undefined;
                            if(selected.from === 'main') {
                                val = row[selected.name || selected.index];
                            }
                            else if(selected.from === 'joiner') {
                                if(other && other[0]) {
                                    val = other[0][selected.name || selected.index];
                                }
                            }
                            if(selected.name) {
                                sel[selected.name] = val;
                            }
                            else {
                                sel.push(val);
                            }
                        })
                        body.push(sel);
                    }
                });
                results.body = body;
                if(statement.assign) {
                    opts.context[statement.assign] = results.body;
                }
                return selectEvent.cb(err, results);
            });
        }
        else {
            return selectEvent.cb(err, results);
        }
    }, selectEvent.event);
};

//
// Execute a parsed select statement with no joins
function execInternal(opts, statement, cb, parentEvent) {
    var tables = opts.tables, tempResources = opts.tempResources, context = opts.context,
        request = opts.request, emitter = opts.emitter;

    var selectExecTx = logEmitter.wrapEvent(parentEvent, 'QlIoSelectExec', null, cb);
    //
    // Analyze where conditions and fetch any dependent data
    var name, ret, params, value, i, r, p, max, resource, apiTx;
    var tasks = [];
    _.each(statement.whereCriteria, function(cond) {
        if(cond.operator === '=') {
            name = cond.lhs.name;
            //
            // This is a string value. No need to do any remote fetch.
            // This is a curry. There are more curried functions below. If you don't know
            // what currying is, don't touch this code unless you read Crockford's book.
            tasks.push(function(cond, name) {
                return function(callback) {
                    ret = {};
                    ret[name] = jsonfill.lookup(cond.rhs.value || cond.rhs, context);
                    callback(null, ret);
                };
            }(cond, name));
        }
        //
        // This is an IN condition. RHS could be a comma separated string or a SELECT
        else if(cond.operator === 'in') {
            name = cond.lhs.name;
            if(cond.rhs.fromClause) {
                tasks.push(function(cond, name) {
                    return function(callback) {
                        execInternal(opts, cond.rhs, function(e, r) {
                            if(e) {
                                callback(e);
                            }
                            else {
                                ret = {};
                                ret[name] = r.body;
                                callback(null, ret);
                            }
                        }, selectExecTx.event);
                    };
                }(cond, name));
            }
            else if(_.isArray(cond.rhs.value)) {
                tasks.push(function(cond, name) {
                    return function(callback) {
                        ret = {};
                        ret[name] = [];
                        // Expand variables from context
                        _.each(cond.rhs.value, function(key) {
                            var arr = jsonfill.lookup(key, context);
                            if(_.isArray(arr)) {
                                _.each(arr, function(v) {
                                    ret[name].push(v);
                                });
                            }
                            else {
                                ret[name].push(arr);
                            }
                        });
                        callback(null, ret);
                    };
                }(cond, name));
            }
        }
    });

    // Run tasks asynchronously and join on the callback. On completion, the results array will
    // have the values to execute this statement
    async.parallel(tasks,
        function(err, results) {
            // Now fetch each resource from left to right
            _.each(statement.fromClause, function(from) {
                // Reorder results - async results is an array of objects, but we just want an object
                params = {};
                for(i = 0,max = results.length; i < max; i++) {
                    r = results[i];
                    for(p in r) {
                        if(r.hasOwnProperty(p)) {
                            value = r[p];
                            // Resolve alias
                            if(p.indexOf(from.alias + '.') === 0) {
                                p = p.substr(from.alias.length + 1);
                            }
                            params[p] = value;
                        }
                    }
                }

                name = from.name;
                // Lookup context for the source
                if(name.indexOf('{') === 0) {
                    name = name.substring(1, from.name.length - 1);
                }
                resource = context[name];
                if(context.hasOwnProperty(name)) { // The value may be null/undefined, and hence the check the property
                    apiTx = logEmitter.wrapEvent(selectExecTx.event, 'API', name, selectExecTx.cb);
                    resource = jsonfill.unwrap(resource);

                    // Local filtering (rudimentary)
                    var filtered;
                    if(statement.whereCriteria && statement.whereCriteria.length > 0) {
                        filtered = [];
                        // Wrap into an array if source is not an array. Otherwise we will end up
                        // iterating over its props.
                        resource = _.isArray(resource) ? resource : [resource];

                        _.each(resource, function(row) {
                            _.each(statement.whereCriteria, function(cond) {
                                assert.ok(cond.operator === '=', 'Local filtering supported for = only');
                                var path = cond.lhs.name;
                                if(path.indexOf(from.alias + '.') === 0) {
                                    path = path.substr(from.alias.length + 1);
                                }
                                var expected = cond.rhs.value;
                                var result = jsonPath.eval(row, path, {flatten: true});
                                if(result && _.isArray(result) && result.length == 1 && result[0] === expected) {
                                    filtered.push(row);
                                }
                            });
                        });
                    }
                    else {
                        // If there are no where conditions, use the original
                        filtered = resource;
                    }

                    // Project
                    project.run('', statement, filtered, function(projected) {
                        if(statement.assign) {
                            context[statement.assign] = projected;
                        }
                        return apiTx.cb(null, {
                            headers: {
                                'content-type': 'application/json'
                            },
                            body: projected
                        });
                    });
                }
                else {
                    // Get the resource
                    resource = tempResources[from.name] || tables[from.name];
                    apiTx = logEmitter.wrapEvent(selectExecTx.event, 'API', from.name, selectExecTx.cb);
                    if(!resource) {
                        return apiTx.cb({
                            message: 'No such resource ' + from.name
                        });
                    }
                    if(!resource.select) {
                        return apiTx.cb({
                            message: 'Resource ' + from.name + ' does not support select'
                        });
                    }

                    // Limit and offset
                    var limit = resource.select.aliases && resource.select.aliases.limit || 'limit';
                    params[limit] = statement.limit;
                    var offset = resource.select.aliases && resource.select.aliases.offset || 'offset';
                    params[offset] = statement.offset;

                    httpRequest.exec({
                        context: opts.context,
                        config: opts.config,
                        settings: opts.settings,
                        resource: resource.select,
                        xformers: opts.xformers,
                        params: params,
                        request: request,
                        statement: statement,
                        emitter: emitter,
                        callback: function(err, result) {
                            if(result) {
                                context[statement.assign] = result.body;
                            }
                            return apiTx.cb(err, result);
                        }
                    });
                }
            });
        });
}

var clone = function(obj) {
    if(obj == null || typeof(obj) != 'object') {
        return obj;
    }

    var temp = obj.constructor(); // changed

    for(var key in obj) {
        temp[key] = clone(obj[key]);
    }
    return temp;
};

