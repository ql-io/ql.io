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

var http = require('http'),
    _ = require('underscore');

var Console = require('../app.js');
var c = new Console({
    tables: __dirname + '/tables',
    routes: __dirname + '/routes',
    config: __dirname + '/config/dev.json',
    'enable console': false,
    connection: 'close'
});

var app = c.app;

//
// This is a clever test - but illustrates lot of dog-fooding.
//
// The goal of this test is to ensure that the engine is able to process
// application/x-www-form-urlencoded body templates.  But APIs that use this encoding are not
// common. So, as the first step, this test sets up a route that requires
// application/x-www-form-urlencoded body, and wraps that route with a table.
//

module.exports = {
    'post body': function(test) {
        app.listen(3000, function() {
            var statement = 'select itemId from finditems where keywords = "iPad" and  q = "{q}"';
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/q?q=test&s=' + encodeURIComponent(statement),
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                test.equals(res.statusCode, 200);
                var data = '';
                res.on('data', function(chunk) {
                    data = data + chunk;
                })
                res.on('end', function() {
                    var ids = JSON.parse(data);
                    test.ok(_.isArray(ids));
                    var param = '';
                    _.each(ids, function(row) {
                        param += row + ',';
                    })
                    param = param.substr(0, param.length - 1);

                    // Now make the second request to the proxy
                    options.path = '/q?s=' + encodeURIComponent('select * from proxy.item where itemId="' + param + '"');

                    var req1 = http.request(options, function(res1) {
                        res1.setEncoding('utf8');
                        test.equals(res1.statusCode, 200);
                        test.equals(res1.headers['content-type'], 'application/json');
                        var data = '';
                        res1.on('data', function(chunk) {
                            data = data + chunk;
                        })
                        res1.on('end', function() {
                            var items = JSON.parse(data);
                            test.ok(_.isArray(items));
                            var reorg = {};
                            _.each(items, function(item) {
                                reorg[item.ItemID] = item;
                            })
                            _.each(ids, function(id) {
                                test.ok(reorg[id], 'ItemID in req and resp don\'t match')
                            })
                            app.close();
                            test.done();
                        });

                    });
                    req1.end();
                });
            });
            req.end();
        });
    }
}