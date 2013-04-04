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

var filter = require('./filter.js'),
    _util = require('./util.js'),
    where = require('./where.js'),
    project = require('./project.js'),
    udf = require('./udf.js'),
    strTemplate = require('ql.io-str-template'),
    _ = require('underscore'),
    async = require('async'),
    assert = require('assert');

exports.exec = function(opts, statement, parentEvent, cb) {

    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(cb, 'Argument cb can not be undefined');
    assert.ok(opts.xformers, 'No xformers set');

    var funcs, cloned, joiningColumns, selectEvent;
    selectEvent = opts.logEmitter.beginEvent({
        parent: parentEvent,
        name: 'select',
        message: {
            line: statement.line
        },
        cb: cb
    });

    //
    // Run select on the main statement first. If there is a joiner, run the joiner after the
    // main statement completes, and merge the results.
    //
    execInternal(opts, statement, selectEvent.event, function(err, results) {
        if(err) {
            return selectEvent.end(err, results);
        }
        if(statement.joiner) {
            // Do the join now - execute the joiner once for each row from the main's results.
            joiningColumns = _.map(statement.joiner.whereCriteria, function(criteria){
                return criteria.rhs.joiningColumn;
            });

            // Prepare the joins
            funcs = [];
            var maxRequests = _util.getMaxRequests(opts.config, opts.logEmitter), maxNestedRequestsExceeded = false;
            _.each(results.body, function(row) {
                // Clone the whereClause since we are going to modify it
                cloned = _.clone(statement.joiner);
                cloned.whereCriteria = clone(cloned.whereCriteria);

                // Set the join field on the joiner statement.
                for(var i in cloned.whereCriteria){
                    if (joiningColumns[i] != undefined)
                    cloned.whereCriteria[i].rhs.value = (_.isArray(row) || _.isObject(row)) ? row[joiningColumns[i]] : row;
                }

                // Determine whether the number of funcs is within the limit, otherwise break out of the loop
                if (funcs.length >= maxRequests) {
                    maxNestedRequestsExceeded = true;
                    return;
                }

                // Prepare joiners - this an n-ary - once per row on the main
                funcs.push(function(s) {
                    return function(callback) {
                        execInternal(opts, s, selectEvent.event, function(e, r) {
                            if(e) {
                                callback(e);
                            }
                            else {
                                callback(null, r.body);
                            }
                        });
                    };
                }(cloned));
            });

            if (maxNestedRequestsExceeded) {
                opts.logEmitter.emitWarning('Pruned the number of nested requests to config.maxNestedRequests = ' + maxRequests + '.');
            }

            // Execute joins
            async.parallel(funcs, function(err, more) {
                if(err) {
                    return selectEvent.end(err);
                }
                // If there is nothing to loop through, leave the body undefined.
                var body = results.body ? [] : undefined;
                var tempNames = [], tempIndices = [], first = true;
                _.each(results.body, function(row, index) {
                    // If no matching result is found in more, skip this row
                    var other = more[index];
                    var loop = other ? (_.isArray(other) ? other.length : 1) : 0;
                    for(var l = 0; l < loop; l++) {
                        // Results would be an array when one field is selected.
                        if(!_.isObject(row) && !_.isArray(row)) row = [row];

                        // When columns are selected by name, use an object. If not, an array.
                        var sel = statement.selected.length > 0 && statement.selected[0].name ? {} : [];

                        // In case of joins, the columns selected on the main and the joiner are not
                        // actually what were specified on the original select. The selected array
                        // tells us where to find the columns that the user wanted.
                        //
                        // UDF is a special case here. UDFs in the where clause can specify
                        // args from either of the tables in the join, and so, we select them,
                        // and mark with a 'for' = 'udf' property. We discard these after preparing
                        // args for UDFs. The tempNames/tempIndices arrays capture these extras.
                        _.each(statement.selected, function(selected) {
                            var val = undefined;
                            if(first && selected['for'] === 'udf') {
                                // Mark - for later removal
                                if(selected.name) {
                                    tempNames.push(selected.name);
                                }
                                else {
                                    tempIndices.push(sel.length);
                                }
                            }
                            if(selected.from === 'main') {
                                val = row[selected.name || selected.index];
                            }
                            else if(selected.from === 'joiner') {
                                if(other[l]) {
                                    if(other[l].hasOwnProperty(selected.name)) {
                                        val = other[l][selected.name];
                                    }
                                    else if(_.isArray(other[l])) {
                                        val = other[l][selected.index];
                                    }
                                    else {
                                        val = other[l];
                                    }
                                }
                            }
                            if(selected.name) {
                                sel[selected.name] = val;
                            }
                            else {
                                sel.push(val);
                            }
                        });
                        first = false;
                        body.push(sel);
                    }
                });
                results.body = body;
                // Apply UDFs on the where clause.
                udf.applyWhere(opts, statement, results, function(err, results) {
                    if(err) {
                        return selectEvent.end(err);
                    }
                    else {
                        if(statement.assign) {
                            opts.context[statement.assign] = results.body;
                            opts.emitter.emit(statement.assign, results.body);
                        }
                        return selectEvent.end(null, results);
                    }
                }, tempNames, tempIndices);
            });
        }
        else {
            if(statement.joiner) {
                // Defer where clause UDF to the join time
                return selectEvent.end(err, results);
            }
            else {
                // Run where clause UDFs now
                return udf.applyWhere(opts, statement, results, function(err, results) {
                    if(err) {
                        return selectEvent.end(err);
                    }
                    else {
                        if(statement.assign) {
                            opts.context[statement.assign] = results.body;
                            opts.emitter.emit(statement.assign, results.body);
                        }
                        return selectEvent.end(null, results);
                    }
                });
            }
        }
    });
};

//
// Execute a parsed select statement with no joins
function execInternal(opts, statement, parentEvent, cb) {
    var tables = opts.tables, tempResources = opts.tempResources, context = opts.context,
         request = opts.request, emitter = opts.emitter;

    var selectExecTx  = opts.logEmitter.beginEvent({
            parent: parentEvent,
            name: 'select-exec',
            message: {
                line: statement.line
            },
            cb: cb});

    //
    // Pre-fill columns
    var prefill = function(column) {
        // Trim the name, but keep the column alias.
        try {
            var template = strTemplate.parse(column.name);
            column.name = template.format(opts.context, true);
        }
        catch(e) {
            // Ignore
        }
        return column;
    };
    if(_.isArray(statement.columns)) {
        _.each(statement.columns, function(column, i) {
            statement.columns[i] = prefill(column);
        });
    }
    else {
        statement.columns = prefill(statement.columns);
    }

    //
    // Analyze where conditions and fetch any dependent data
    var name, params, value, r, p, max, resource, apiTx;
    where.exec(opts, statement.whereCriteria, function(err, results) {
        var i;
        // Now fetch each resource from left to right
        _.each(statement.fromClause, function(from) {
            // Reorder results - results is an array of objects, but we just want an object
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
            // Lookup context for the source - we do this since the compiler puts the name in
            // braces to denote the source as a variable and not a table.
            if(name.indexOf("{") === 0 && name.indexOf("}") === name.length - 1) {
                name = name.substring(1, from.name.length - 1);
            }
            resource = context[name];
            if(context.hasOwnProperty(name)) { // The value may be null/undefined, and hence the check the property
                apiTx = opts.logEmitter.beginEvent({
                    parent: selectExecTx.event,
                    type: 'table',
                    name: name,
                    message: {
                        line: statement.line
                    },
                    cb: selectExecTx.cb});

                var filtered = filter.filter(resource, statement, context, from);

                // Project
                project.run('', statement, filtered, opts.context, function (projected) {
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
                apiTx = opts.logEmitter.beginEvent({
                        parent: selectExecTx.event,
                        type: 'table',
                        name: from.name,
                        message: {line: statement.line},
                        cb: selectExecTx.cb});

                if(!resource) {
                    return apiTx.cb('No such table ' + from.name);
                }
                var verb = resource.verb('select');
                if(!verb) {
                    return apiTx.cb('Table ' + from.name + ' does not support select');
                }

                // Limit and offset
                var limit = verb.aliases && verb.aliases.limit || 'limit';
                params[limit] = statement.limit;
                var offset = verb.aliases && verb.aliases.offset || 'offset';
                params[offset] = statement.offset;
                verb.exec({
                    name: name,
                    context: opts.context,
                    config: opts.config,
                    settings: opts.settings,
                    resource: verb.connector,
                    xformers: opts.xformers,
                    serializers: opts.serializers,
                    params: params,
                    request: request,
                    statement: statement,
                    emitter: emitter,
                    logEmitter: opts.logEmitter,
                    parentEvent: apiTx.event,
                    callback: function(err, result) {
                        if(result) {
                            context[statement.assign] = result.body;
                            emitter.emit(statement.assign, result.body);
                        }
                        return apiTx.cb(err, result);
                    },
                    cache: opts.cache
                });
            }
        });
    }, parentEvent);
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
