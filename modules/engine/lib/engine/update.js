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

var _ = require('underscore'),
    assert = require('assert');

exports.exec = function(opts, statement, parentEvent, cb) {

    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(statement, 'Argument cb can not be undefined');

    var tables = opts.tables, context = opts.context,
        request = opts.request, emitter = opts.emitter,
        updateTx, table, values, name;

    // Get the dest
    name = statement.source.name;
    updateTx = opts.logEmitter.beginEvent({
        parent: parentEvent,
        type: 'update',
        message: {
            line: statement.line
        },
        cb: cb});

    values = {};
    // Get the resource
    table = opts.tempResources[name] || tables[name];
    if(!table) {
        return updateTx.cb('No such table ' + name);
    }
    var verb = table.verb('update');

    if(!verb) {
        return updateTx.cb('Table ' + statement.source.name + ' does not support update');
    }

    if (statement.withClause) {
        var obj = statement.withClause.value;
        if(obj.indexOf("{") === 0 && obj.indexOf("}") === obj.length - 1) {
            obj = obj.substring(1, obj.length - 1);
        }
        values = context[obj];
    }

    verb.exec({
        name: name,
        context: opts.context,
        config: opts.config,
        settings: opts.settings,
        resource: verb.connector,
        xformers: opts.xformers,
        serializers: opts.serializers,
        params: values,
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

};
