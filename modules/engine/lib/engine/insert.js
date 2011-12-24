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

var httpRequest = require('./http.request.js'),
    jsonfill = require('./jsonfill.js'),
    _ = require('underscore'),
    async = require('async'),
    assert = require('assert');

exports.exec = function(opts, statement, cb, parentEvent) {

    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(statement, 'Argument cb can not be undefined');

    var tables = opts.tables, context = opts.context,
        request = opts.request, emitter = opts.emitter;

    var insertTx = opts.logEmitter.wrapEvent(parentEvent, 'QlIoInsert', null, cb);

    // Get the table
    var table = tables[statement.source.name];
    if (!table) {
        return insertTx.cb({
            message: 'No such table ' + statement.source.name
        });
    }
    if (!table.insert) {
        return insertTx.cb({
            message: 'Table ' + statement.source.name + ' does not support insert'
        });
    }

    var values = {};
    _.each(statement.values, function(value, i) {
        values[statement.columns[i].name] = jsonfill.lookup(value, context);
    });

    httpRequest.exec({
        context: opts.context,
        config: opts.config,
        settings: opts.settings,
        resource: table.insert,
        xformers: opts.xformers,
        params: values,
        request: request,
        statement: statement,
        emitter: emitter,
        callback: function(err, result) {
            if (result) {
                context[statement.assign] = result.body;
                opts.emitter.emit(statement.assign, result.body);
            }
            return insertTx.cb(err, result);
        }
    });
};
