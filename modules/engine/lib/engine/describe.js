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

var assert = require('assert'),
    _ = require('underscore');

/**
 * Implements describe
 *
 * @param statement
 * @param cb
 */
var cache = {};
exports.exec = function(opts, statement, cb) {

    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(cb, 'Argument cb can not be undefined');

    var tables = opts.tables, tempTables = opts.tempResources, params = opts.request.params || {};

    var table, desc;
    var key = statement.source.name;
    desc = cache[key];
    if(desc) {
        return cb(undefined, {
            headers: {
                'content-type': 'application/json'
            },
            body: desc
        })
    }

    // If not cached
    table = tables[statement.source.name] || tempTables[statement.source.name];
    if (table) {
        desc = {
            'name':table.meta.name,
            'about':'/table?name=' + encodeURIComponent(table.meta.name),
            'info':table.meta.comments || '',
            'routes':table.meta.routes
        };
        _.each(['select', 'insert', 'update', 'delete'], function(type) {
            var verb = table.verb(type);
            if(verb) {
                desc[verb.type] = {
                    'request':verb.method + ' ' + verb.uri,
                    'params':verb.params,
                    'headers':verb.headers
                };
                if (verb.body) {
                    desc[verb.type].body = {
                        'type':verb.body.type,
                        'content':verb.body.content
                    };
                }
            }
        })

        cache[key] = desc;
        cb(null, {
            headers:{'content-type':'application/json'},
            body:desc
        });
    }
    else {
        cb('No such table ' + statement.source.name);
    }
}

