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

var http = require('http'),
    Console = require('../app.js'),
    headers = require('headers');

// Check the Link header
module.exports = {
    'no-link': function(test) {
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
                path: "/q?s=select%20*%20from%20finditems%20where%20keywords%3D'ipad'",
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
                    var results = JSON.parse(data);
                    test.ok(results.length > 0);
                    test.ok(!res.headers.link)
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    },

    'link': function(test) {

        var c = new Console({
            tables: __dirname + '/tables',
            routes: __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        var path = '/q?s=' + encodeURIComponent('select * from finditems where keywords="ipad"');
        var events = ['ack', 'compile-error', 'statement-error', 'statement-in-flight',
            'statement-success', 'statement-request', 'statement-response', 'script-done'];
        var packet = {
            type: 'events',
            data: JSON.stringify(events)
        }
        path = path + '&events=' +  encodeURIComponent(JSON.stringify(packet));
        app.listen(3000, function () {
            var options = {
                host: 'localhost',
                port: 3000,
                path: path,
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
                    var results = JSON.parse(data);
                    test.ok(results.length > 0);
                    test.ok(res.headers['link']);
                    var link = res.headers['link'];
                    link = headers.parse('Link', link);
                    test.equals(link.href.indexOf('data:application/json,'), 0);
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    }
}