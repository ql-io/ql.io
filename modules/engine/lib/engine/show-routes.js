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
 * Implements SHOW ROUTES
 *
 * @param statement
 * @param cb
 */
exports.exec = function(opts, statement, cb) {
    var arr = [], routes = opts.routes, context = opts.context;

    assert.ok(opts.routes, 'Argument routes can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(cb, 'Argument cb can not be undefined');


    if (statement.assign) {
        context[statement.assign] = routes;
    }


    cb(null, {
            headers: {
                'content-type': 'application/json'
            },
            body:
                _(routes).chain()
               .values()
               .map(function(aUrl){
                        return _.values(aUrl);
                    })
               .flatten()
               .pluck('routeInfo')
               .map(function(aRoute){
                        return { route: aRoute.path.value, method: aRoute.method };
                    })
               .value()
        }
    );
}