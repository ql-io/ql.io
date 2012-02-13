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

var mustache = require('mustache'),
    assert = require('assert'),
    _ = require('underscore'),
    fs = require('fs');

var lreg = new RegExp("{{", 'g');
var rreg = new RegExp("}}", 'g');
var ulreg = new RegExp("{ {", 'g');
var urreg = new RegExp("} }", 'g');

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

    var table, template, desc;
    var key = statement.source.name + (params.fromRoute ? ":fromRoute" : "");
    desc = cache[key];
    if(desc) {
        return cb(undefined, {
            headers: {
                'content-type': 'text/html'
            },
            body: desc
        })
    }

    // If not cached
    table = tables[statement.source.name] || tempTables[statement.source.name];
    if(table) {
        if (params.fromRoute) {
            desc = {
                'name' : table.meta.name,
                'about': '/table?name='+ encodeURIComponent(table.meta.name),
                'info': table.meta.comments || ''
            };
            _.each(table.meta.statements, function(statement){
                desc[statement.type] = {
                    'request' : statement.method + ' ' + statement.uri,
                    'params'  : statement.params,
                    'headers' : statement.headers
                };
                if(statement.body){
                    desc[statement.type].body = {
                        'type'   : statement.body.type,
                        'content': statement.body.content
                    };
                }
            })

            cache[key] = desc;
            cb(null, {
                headers: {'content-type': 'application/json'},
                body: desc
            });
        }
        else {
            fs.readFile(__dirname + '/describe.html.mu', 'utf8', function(err, data) {
                if(err) {
                    return cb(err);
                }
                else {

                    // Escape {{ and }} before using mustache.
                    _.each(table.meta.statements, function(statement) {
                        if (statement.body && statement.body.content) {
                            statement.body.content = statement.body.content.replace(lreg, '{ {')
                            statement.body.content = statement.body.content.replace(rreg, '} }')
                        }
                    })
                    desc = mustache.to_html(data, table.meta);
                    // Undo escape {{ and }}
                    desc = desc.replace(ulreg, '{{')
                    desc = desc.replace(urreg, '}}')
                    cache[key] = desc;
                    cb(null, {
                        headers: {'content-type': 'text/html'},
                        body: desc
                    });
                }
            });
        }
    }
    else {
        cb({
            message: 'No such table ' + statement.source.name
        });
    }
}

