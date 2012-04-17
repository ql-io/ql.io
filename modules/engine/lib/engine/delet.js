/*
 * Copyright 2012 eBay Software Foundation
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

'use strict';

var filter = require('./filter.js'),
    where = require('./where.js'),
    _ = require('underscore'),
    assert = require('assert');

exports.exec = function (opts, statement, parentEvent, cb) {

    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(cb, 'Argument cb can not be undefined');
    assert.ok(opts.xformers, 'No xformers set');

    var deleteEvent = opts.logEmitter.beginEvent({
        parent: parentEvent,
        name: 'delete',
        message: {
            line: statement.line
        },
        cb: cb
    });

    var tables = opts.tables, tempResources = opts.tempResources, context = opts.context,
        request = opts.request, emitter = opts.emitter;
    var deleteExecTx = opts.logEmitter.beginEvent({
        parent: deleteEvent.event,
        name: 'delete',
        message: {
            line: statement.line
        },
        cb: function (err, results) {
            return deleteEvent.cb(err, results);
        }
    });

    //
    // Analyze where conditions and fetch any dependent data
    var params, i, r, p, max, resource, apiTx;
    where.exec(opts, statement.whereCriteria, function (err, results) {
        // Results should now have the params for executing the delete.

        // Reorder results - results is an array of objects, but we just want an object
        params = {};
        for(i = 0, max = results.length; i < max; i++) {
            r = results[i];
            for(p in r) {
                if(r.hasOwnProperty(p)) {
                    params[p] = r[p];
                }
            }
        }

        var name = statement.source.name;

        // Lookup context for the source - we do this since the compiler puts the name in
        // braces to denote the source as a variable and not a table.
        if(name.indexOf("{") === 0 && name.indexOf("}") === name.length - 1) {
            name = name.substring(1, name.length - 1);
        }
        resource = context[name];
        if(context.hasOwnProperty(name)) { // The value may be null/undefined, and hence the check the property
            apiTx = opts.logEmitter.beginEvent({
                parent: deleteExecTx.event,
                name: name,
                message: {
                    line: statement.line
                },
                cb: deleteExecTx.cb});

            if(_.isArray(resource)) {
                resource = filter.reject(resource, statement, context, statement.source);
            }
            else if(_.isObject(resource)) {
                _.each(params, function(val, key) {
                    if(resource.hasOwnProperty(key) && resource[key] === val) {
                        delete resource[key];
                    }
                });
            }

            if(statement.assign) {
                context[statement.assign] = resource;
                emitter.emit(statement.assign, resource);
            }
            return apiTx.cb(null, {
                headers: {
                    'content-type': 'application/json'
                },
                body: resource
            });
        }
        else {
            // Get the resource
            resource = tempResources[name] || tables[name];
            apiTx = opts.logEmitter.beginEvent({
                parent: deleteExecTx.event,
                type: 'table',
                name: name,
                message: {
                    line: statement.line
                },
                cb: deleteExecTx.cb
            });
            if(!resource) {
                return apiTx.cb('No such table ' + name);
            }
            var verb = resource.verb('delete');
            if(!verb) {
                return apiTx.cb('Table ' + name + ' does not support select');
            }
            // Limit and offset
            verb.exec({
                context: opts.context,
                config: opts.config,
                settings: opts.settings,
                resource: verb,
                xformers: opts.xformers,
                serializers: opts.serializers,
                params: params,
                request: request,
                statement: statement,
                emitter: emitter,
                logEmitter: opts.logEmitter,
                parentEvent: apiTx.event,
                callback: function (err, result) {
                    if(result) {
                        context[statement.assign] = result.body;
                        emitter.emit(statement.assign, result.body);
                    }
                    return apiTx.cb(err, result);
                }
            });
        }
    });
};
