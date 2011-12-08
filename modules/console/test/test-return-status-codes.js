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

var http = require('http'),
    Console = require('../app.js'),
    headers = require('headers');

module.exports = {
    'gateway-error-status':function (test) {
        var c = new Console({
            tables: __dirname + '/tables',
            routes: __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: "/q?s=select%20*%20from%20invalid.table",
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                test.ok(res.statusCode === 502);
                app.close();
                test.done();
            });

            req.on('error', function(err) {
                console.log(err);
                test.ok(false);
                app.close();
                test.done();

            });
            req.end();
        });
    }
}