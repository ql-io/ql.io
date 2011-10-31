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

var _ = require('underscore'),
    assert = require('assert');

/**
 * Implements LIST TABLES
 *
 * @param statement
 * @param cb
 */
exports.exec = function(opts, statement, cb) {
    var arr = [], tables = opts.tables, tempResources = opts.tempResources,
        context = opts.context;

    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(cb, 'Argument cb can not be undefined');

    _.each(tables, function(v, r) {
        arr.push(r);
    })

    _.each(tempResources, function(v, r) {
        arr.push(r);
    });

    if(statement.assign) {
        context[statement.assign] = arr;
    }

    cb(null, {
            headers: {
                'content-type': 'application/json'
            },
            body: arr
        });
}