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

"use strict"

var http = require('http');

var Console = require('../app.js');

module.exports = {
    'fill-return-headers': function(test) {
        var c = new Console({
            routes: __dirname + '/fill-return/obj',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/fill-return',
                method: 'GET',
                headers: {
                    h1: 'v1',
                    h2: 'v2',
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                test.equals(res.statusCode, 200);
                test.equals(res.headers['content-type'], 'application/json');
                var data = '';
                res.on('data', function(chunk) {
                    data = data + chunk;
                })
                res.on('end', function() {
                    var resp = JSON.parse(data);
                    test.deepEqual(resp, {
                        'h1' : 'v1',
                        'h2' : 'v2'
                    })
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    },

    'fill-return-path-segments': function(test) {
        var c = new Console({
            routes: __dirname + '/fill-return/obj',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/fill-return/v1/v2',
                method: 'GET',
                headers: {
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                test.equals(res.statusCode, 200);
                test.equals(res.headers['content-type'], 'application/json');
                var data = '';
                res.on('data', function(chunk) {
                    data = data + chunk;
                })
                res.on('end', function() {
                    var resp = JSON.parse(data);
                    test.deepEqual(resp, {
                        'h1' : 'v1',
                        'h2' : 'v2'
                    })
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    },

    'fill-return-query-params': function(test) {
        var c = new Console({
            routes: __dirname + '/fill-return/obj',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/fill-returnp?p1=v1&p2=v2',
                method: 'GET',
                headers: {
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                test.equals(res.statusCode, 200);
                test.equals(res.headers['content-type'], 'application/json');
                var data = '';
                res.on('data', function(chunk) {
                    data = data + chunk;
                })
                res.on('end', function() {
                    var resp = JSON.parse(data);
                    test.deepEqual(resp, {
                        'h1' : 'v1',
                        'h2' : 'v2'
                    })
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    }
}