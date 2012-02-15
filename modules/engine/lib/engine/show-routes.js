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
            body:_(routes.simpleMap).chain()
                .values()
                .map(function (aRoute) {
                    return { path:aRoute.routeInfo.path.value, method:aRoute.routeInfo.method,
                        about:'/route?path=' + encodeURIComponent(aRoute.routeInfo.path.value) + '&method='
                            + aRoute.routeInfo.method,
                        info:aRoute.info
                    };
                })
                .value()
                .sort(function(a, b){
                    var pathA=a.path.toLowerCase(), pathB=b.path.toLowerCase()
                    if (pathA < pathB)
                        return -1
                    if (pathA > pathB)
                        return 1
                    return 0
                })
        }
    );
}