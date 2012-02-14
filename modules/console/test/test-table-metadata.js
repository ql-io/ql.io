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

var _ = require('underscore'),
    Console = require('../app.js'),
    http = require('http'),
    express = require('express'),
    url = require('url');

module.exports = {
    '/table':function (test) {
        var c = new Console({
            tables:__dirname + '/tables',
            routes:__dirname + '/routes/',
            config:__dirname + '/config/dev.json',
            'enable console':false,
            connection:'close'
        });
        c.app.listen(3000, function () {
            var options = {
                host:'localhost',
                port:3000,
                path:'/table?name=ebay.trading.bestoffers',
                method:'GET',
                headers:{
                    'accept':'application/json'
                }
            };
            var req = http.request(options);
            req.addListener('response', function (resp) {
                var data = '';
                resp.addListener('data', function (chunk) {
                    data += chunk;
                });
                resp.addListener('end', function () {
                    var table = JSON.parse(data);
                    test.equals(table.name, 'ebay.trading.bestoffers');
                    test.equals(table.about, '/table?name=ebay.trading.bestoffers');
                    test.equals(table.info, '');
                    test.ok(_.isArray(table.routes) & table.routes.length == 2);
                    test.ok(table.select && table.select.request && table.select.params
                        && table.select.headers && table.select.body);
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    }
}