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

var http = require('http');

var Console = require('../app.js');
module.exports = {
    'remote-address-subst': function(test) {
        var c = new Console({
            tables: __dirname + '/tables',
            routes: __dirname + '/routes/',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;

        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/q?s=return%20%22%7BremoteAddress%7D%22%3B',
                method: 'GET',
                headers: {
                    host: 'localhost',
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
                    test.ok(data.indexOf('127.0.0.1') >= 0);
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    },

    'remote-address-patch': function(test) {
        // Start a resource server
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            var util = require('util');
            util.pump(req, res, function (e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(5000, function () {
            var c = new Console({
                tables: __dirname + '/tables',
                routes: __dirname + '/routes/',
                'enable console': false,
                connection: 'close'
            });

            var app = c.app;

            // Start the console
            app.listen(4000, function () {
                var options = {
                    host: 'localhost',
                    port: 4000,
                    path: '/q?s=select%20*%20from%20remoteip',
                    method: 'GET',
                    headers: {
                        host: 'localhost',
                        connection: 'close'
                    }
                };
                var req = http.request(options, function (res) {
                    res.setEncoding('utf8');
                    test.equals(res.statusCode, 200);
                    test.equals(res.headers['content-type'], 'application/json');
                    var data = '';
                    res.on('data', function (chunk) {
                        data = data + chunk;
                    })
                    res.on('end', function () {
                        data = JSON.parse(data);
                        test.equals(data.remoteAddress, '127.0.0.1');
                        app.close();
                        server.close();
                        test.done();
                    });
                });
                req.end();
            });
        });
    }

}