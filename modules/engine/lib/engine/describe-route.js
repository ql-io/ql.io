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

/**
 * Implements describe routes
 *
 * @param statement
 * @param cb
 */
var verbs = ["del", "get", "patch", "post", "put"];

exports.exec = function(opts, statement, parentEvent, cb) {
var arr = [], routes = opts.routes, context = opts.context, record, otherVerbs = [];

    assert.ok(opts.routes, 'Argument routes can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(cb, 'Argument cb can not be undefined');


    if (statement.assign) {
        context[statement.assign] = routes;
    }

    statement.method = statement.method === 'delete' ? 'del' : statement.method;

    otherVerbs = _.filter(verbs, function(verb) {
        return verb != statement.method && routes.simpleMap[verb + ':' + statement.path.value];
    });

    record = routes.simpleMap[statement.method + ':' + statement.path.value];

    if(!record) {
        return cb('No such route ' + statement.path.value + ' for HTTP method ' + statement.method.toUpperCase());
    }

    cb(null, {
            headers: {
                'content-type': 'application/json'
            },
            body:
            {
                'method': record.routeInfo.method,
                'path'  : record.routeInfo.path.value,
                'about' : '/route?path=' + encodeURIComponent(record.routeInfo.path.value) + '&method=' + record.routeInfo.method,
                'info'  : record.info,
                'tables': _.map(record.tables,function(table){
                    return '/table?name='+encodeURIComponent(table);
                }),
                'related': _.map(otherVerbs, function(verb) {
                    return '/route?path=' + encodeURIComponent(record.routeInfo.path.value) + '&method=' + verb;
                })
            }
        }
    );
}

