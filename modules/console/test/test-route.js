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
    'check delete' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/del/foo/bar/Details?userid=sallamar&itemid=260852758792',
                    method : 'DELETE'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        var json = JSON.parse(data);
                        test.ok(json.user, 'missing user data');
                        test.ok(json.user.Ack, 'missing user Ack');
                        test.equal(json.user.Ack, 'Success');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'check post json' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/ping/pong',
                    method : 'POST',
                    headers : {
                        'content-type' : 'application/json'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val" : {"postPayload" : {"ItemID" : "1818", "UserID" : "someone"}}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('{"itemId":1818,"userId":"someone"}');
                req.end();

            });
        });
    },
    'check post urlencoded' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/ping/pong',
                    method : 'POST',
                    headers : {
                        'content-type' : 'application/x-www-form-urlencoded'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val" : {"postPayload" : {"ItemID" : "1818", "UserID" : "someone"}}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('itemId=1818&userId=someone');
                req.end();

            });
        });
    },
    'check post xml' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/ping/pongxml',
                    method : 'POST',
                    headers : {
                        'content-type' : 'application/xml'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val" : {"postPayload" : {"ItemID" : "1818", "UserID" : "someone"}}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('<payload><itemId>1818</itemId><userId>someone</userId></payload>');
                req.end();
            });
        });
    },
    'check put urlencoded' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {

                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/ping/pong',
                    method : 'PUT',
                    headers : {
                        'content-type' : 'application/x-www-form-urlencoded'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val" : {"postPayload" : {"ItemID" : "1818", "UserID" : "someone"}}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('itemId=1818&userId=someone');
                req.end();
            });
        });
    },
    'check post for no mu' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.get('/bing/bong', function(req, res) {
                req.on('data', function(chunk) {
                    // do nothing
                });
                req.on('end', function() {
                    res.send(JSON.stringify(url.parse(req.url, true).query));
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/bing/bong',
                    method : 'POST',
                    headers : {
                        'content-type' : 'application/json'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val":{"QueryKeywords":"ipod"}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('{"keywords":"ipod"}');
                req.end();

            });
        });
    },
    'check put for no mu' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.get('/bing/bong', function(req, res) {
                req.on('data', function(chunk) {
                    // do nothing
                });
                req.on('end', function() {
                    res.send(JSON.stringify(url.parse(req.url, true).query));
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/bing/bong',
                    method : 'PUT',
                    headers : {
                        'content-type' : 'application/json'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val":{"QueryKeywords":"ipod"}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('{"keywords":"ipod"}');
                req.end();

            });
        });
    },
    'check /routes html' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var options = {
                host : 'localhost',
                port : 3000,
                path : '/routes',
                method : 'GET'
            };
            var req = http.request(options);
            req.addListener('response', function(resp) {
                var data = '';
                resp.addListener('data', function(chunk) {
                    data += chunk;
                });
                resp.addListener('end', function() {
                    test.ok(/^text\/html/.test(resp.headers['content-type']));
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /routes' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/routes',
                    method : 'GET',
                    headers : {
                        'accept': 'application/json'
                    }
                };
            var req = http.request(options);
            req.addListener('response', function(resp) {
                var data = '';
                resp.addListener('data', function(chunk) {
                    data += chunk;
                });
                resp.addListener('end', function() {
                    var routes = JSON.parse(data);
                    test.ok(_.isArray(routes), 'show routes result is not array');
                    _.each(routes, function(route) {
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
    'check /route html' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get',
                    method : 'GET',
                };
            var req = http.request(options);
            req.addListener('response', function(resp) {
                var data = '';
                resp.addListener('data', function(chunk) {
                    data += chunk;
                });
                resp.addListener('end', function() {
                    test.ok(/^text\/html/.test(resp.headers['content-type']));
                    c.app.close();
                    test.done();
                });
            });
            req.end();

        });
    },
    'check /route' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var options = {
                host : 'localhost',
                port : 3000,
                path : '/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get',
                method : 'GET',
                headers : {
                    'accept': 'application/json'
                }
            };
            var req = http.request(options);
            req.addListener('response', function(resp) {
                var data = '';
                resp.addListener('data', function(chunk) {
                    data += chunk;
                });
                resp.addListener('end', function() {
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
    'check /tables html' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/tables',
                    method : 'GET'
                };
            var req = http.request(options);
            req.addListener('response', function(resp) {
                var data = '';
                resp.addListener('data', function(chunk) {
                    data += chunk;
                });
                resp.addListener('end', function() {
                    test.ok(/^text\/html/.test(resp.headers['content-type']));
                    c.app.close();
                    test.done();
                });

            });
            req.end();

        });
    },
    'check /tables' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var options = {
                host : 'localhost',
                port : 3000,
                path : '/tables',
                method : 'GET',
                headers : {
                    'accept': 'application/json'
                }
            };
            var req = http.request(options);
            req.addListener('response', function(resp) {
                var data = '';
                resp.addListener('data', function(chunk) {
                    data += chunk;
                });
                resp.addListener('end', function() {
                    var tables = JSON.parse(data);
                    test.ok(_.isArray(tables), 'list tables result is not array');
                    _.each(tables, function(table) {
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
    'case sensitivity' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function () {
        });

        var options = {
            host:'localhost',
            port:3000,
            path:'/DEl/foo/bar/Details?userid=sallamar&itemid=260852758792',
            method:'DELETE'
        };
        var req = http.request(options);
        req.addListener('response', function (resp) {
            var data = '';
            resp.addListener('data', function (chunk) {
                data += chunk;
            });
            resp.addListener('end', function () {
                test.equal(resp.statusCode, 404);
                c.app.close();
                test.done();
            });
        });
        req.end();
    }
}