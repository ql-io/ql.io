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

'use strict';

var jsonfill = require('./jsonfill.js'),
    jsonPath = require('JSONPath'),
    _ = require('underscore'),
    filter = require('./filter.js'),
    where = require('./where.js'),
    assert = require('assert');

exports.exec = function(opts, statement, parentEvent, cb) {

    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(statement, 'Argument cb can not be undefined');

    var tables = opts.tables, context = opts.context,
        request = opts.request, emitter = opts.emitter,
        updateTx, table, values, name, resource;



    // Get the dest
    name = statement.source.name;

    // Lookup context for the source - we do this since the compiler puts the name in
    // braces to denote the source as a variable and not a table.
    if(name.indexOf("{") === 0 && name.indexOf("}") === name.length - 1) {
        name = name.substring(1, statement.source.name.length - 1);
    }

    updateTx = opts.logEmitter.beginEvent({
        parent: parentEvent,
        type: 'update',
        message: {
            line: statement.line
        },
        cb: cb});

    resource = context[name];
    values = {};
    if(context.hasOwnProperty(name)) { // The value may be null/undefined, and hence the check the property
        resource = jsonfill.unwrap(resource);
        values = statement.setCriteria;
        // find matching rows
        var filtered = filter.filter(resource, statement, context, statement.source);
        _.each(filtered, function(r){
            var keys = _.keys(values);
            _.each(keys, function(key){
                jsonfill.overwrite(key, r, values[key]);
            })
        })
        return updateTx.cb(undefined, resource);
    }
    else {
        // Get the resource
        table = opts.tempResources[name] || tables[name];
        if(!table) {
            return updateTx.cb('No such table ' + name);
        }
        var verb = table.verb('update');
        if(!verb) {
            return updateTx.cb('Table ' + statement.source.name + ' does not support update');
        }
        // gather up all params from set and where
        var params = {};
        if (statement.setCriteria) {
            params = statement.setCriteria;
        }
        if (statement.whereCriteria) {
            var wherePairs = {};
            _.each(statement.whereCriteria, function(whereObj){
                wherePairs[whereObj.lhs.name] = whereObj.rhs.value;
            })
            _.defaults(params, wherePairs);
        }
        verb.exec({
            name: name,
            context: opts.context,
            config: opts.config,
            settings: opts.settings,
            resource: verb,
            xformers: opts.xformers,
            serializers: opts.serializers,
            params: params,
            parts: opts.request.parts,
            request: request,
            statement: statement,
            emitter: emitter,
            logEmitter: opts.logEmitter,
            parentEvent: updateTx.event,
            callback: function(err, result) {
                if(result) {
                    context[statement.assign] = result.body;
                    opts.emitter.emit(statement.assign, result.body);
                }
                return updateTx.cb(err, result);
            }
        });
    }
};
