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
//    '/table':function (test) {
//        var c = new Console({
//            tables:__dirname + '/tables',
//            routes:__dirname + '/routes/',
//            config:__dirname + '/config/dev.json',
//            'enable console':false,
//            connection:'close'
//        });
//        c.app.listen(3000, function () {
//            var options = {
//                host:'localhost',
//                port:3000,
//                path:'/table?name=ebay.trading.bestoffers',
//                method:'GET',
//                headers:{
//                    'accept':'application/json'
//                }
//            };
//            var req = http.request(options);
//            req.addListener('response', function (resp) {
//                var data = '';
//                resp.addListener('data', function (chunk) {
//                    data += chunk;
//                });
//                resp.addListener('end', function () {
//                    var table = JSON.parse(data);
//                    test.equals(table.name, 'ebay.trading.bestoffers');
//                    test.equals(table.about, '/table?name=ebay.trading.bestoffers');
//                    test.equals(table.info, '');
//                    test.ok(_.isArray(table.routes) & table.routes.length == 2);
//                    test.ok(table.select && table.select.request && table.select.params
//                        && table.select.headers && table.select.body);
//                    c.app.close();
//                    test.done();
//                });
//            });
//            req.end();
//
//        });
//    },
    'check /routes html':function (test) {
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
                path:'/routes',
                method:'GET'
            };
            var req = http.request(options);
            req.addListener('response', function (resp) {
                var data = '';
                resp.addListener('data', function (chunk) {
                    data += chunk;
                });
                resp.addListener('end', function () {
                    test.ok(/^text\/html/.test(resp.headers['content-type']));
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /routes':function (test) {
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
                path:'/routes',
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
                    var routes = JSON.parse(data);
                    test.ok(_.isArray(routes), 'show routes result is not array');
                    _.each(routes, function (route) {
                        test.ok(route.path, 'expected route info to contain "path"');
                        test.ok(route.method, 'expected route info to contain "method"');
                        test.ok(route.about, 'expected route info to contain "about"');
                        test.ok(_.isString(route.info), 'expected route info to contain "info"');
                    });
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /routes?json=true':function (test) {
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
                path:'/routes?json=true',
                method:'GET'
            };
            var req = http.request(options);
            req.addListener('response', function (resp) {
                var data = '';
                resp.addListener('data', function (chunk) {
                    data += chunk;
                });
                resp.addListener('end', function () {
                    var routes = JSON.parse(data);
                    test.ok(_.isArray(routes), 'show routes result is not array');
                    _.each(routes, function (route) {
                        test.ok(route.path, 'expected route info to contain "path"');
                        test.ok(route.method, 'expected route info to contain "method"');
                        test.ok(route.about, 'expected route info to contain "about"');
                        test.ok(_.isString(route.info), 'expected route info to contain "info"');
                    });
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /route html':function (test) {

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
                path:'/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get',
                method:'GET'
            };
            var req = http.request(options);
            req.addListener('response', function (resp) {
                var data = '';
                resp.addListener('data', function (chunk) {
                    data += chunk;
                });
                resp.addListener('end', function () {
                    test.ok(/^text\/html/.test(resp.headers['content-type']));
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /route':function (test) {
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
                path:'/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get',
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
                    var route = JSON.parse(data);
                    test.equal(route.method, 'get');
                    test.equal(route.path, '/foo/bar/{selector}?userid={userId}&itemid={itemId}');
                    test.equal(route.about, '/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get');
                    test.ok(_.isString(route.info), 'list.body.info is not String');
                    test.ok(route.info.length > 0, 'Expected length > 0');
                    test.ok(_.isArray(route.tables), 'list.body.tables is not array');
                    test.ok(route.tables.length == 5, 'Expected length = 5');
                    test.ok(_.isArray(route.related), 'list.body.related is not array');
                    test.ok(route.related.length == 0, 'Expected length = 0');
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /route?json=true':function (test) {
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
                path:'/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get&json=true',
                method:'GET'
            };
            var req = http.request(options);
            req.addListener('response', function (resp) {
                var data = '';
                resp.addListener('data', function (chunk) {
                    data += chunk;
                });
                resp.addListener('end', function () {
                    var route = JSON.parse(data);
                    test.equal(route.method, 'get');
                    test.equal(route.path, '/foo/bar/{selector}?userid={userId}&itemid={itemId}');
                    test.equal(route.about, '/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get');
                    test.ok(_.isString(route.info), 'list.body.info is not String');
                    test.ok(route.info.length > 0, 'Expected length > 0');
                    test.ok(_.isArray(route.tables), 'list.body.tables is not array');
                    test.ok(route.tables.length == 5, 'Expected length = 5');
                    test.ok(_.isArray(route.related), 'list.body.related is not array');
                    test.ok(route.related.length == 0, 'Expected length = 0');
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /tables html':function (test) {
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
                path:'/tables',
                method:'GET'
            };
            var req = http.request(options);
            req.addListener('response', function (resp) {
                var data = '';
                resp.addListener('data', function (chunk) {
                    data += chunk;
                });
                resp.addListener('end', function () {
                    test.ok(/^text\/html/.test(resp.headers['content-type']));
                    c.app.close();
                    test.done();
                });

            });
            req.end();

        });
    },
    'check /tables':function (test) {
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
                path:'/tables',
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
                    var tables = JSON.parse(data);
                    test.ok(_.isArray(tables), 'list tables result is not array');
                    _.each(tables, function (table) {
                        test.ok(table.name, "table 'name' not provided");
                        test.ok(table.about, "table 'about' not provided")
                    });
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /tables?json=true':function (test) {
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
                path:'/tables?json=true',
                method:'GET'
            };
            var req = http.request(options);
            req.addListener('response', function (resp) {
                var data = '';
                resp.addListener('data', function (chunk) {
                    data += chunk;
                });
                resp.addListener('end', function () {
                    var tables = JSON.parse(data);
                    test.ok(_.isArray(tables), 'list tables result is not array');
                    _.each(tables, function (table) {
                        test.ok(table.name, "table 'name' not provided");
                        test.ok(table.about, "table 'about' not provided")
                    });
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    '/table?json=true':function (test) {
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
                path:'/table?name=ebay.trading.bestoffers&json=true',
                method:'GET'
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