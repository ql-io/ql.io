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
    sys = require('sys'),
    Console = require('../app.js'),
    http = require('http'),
    express = require('express'),
    url = require('url');

module.exports = {
    'check delete call' : function(test) {
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
    'check post json call' : function(test) {
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
    'check post urlencoded call' : function(test) {
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
    'check post xml call' : function(test) {
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
    'check put urlencoded call' : function(test) {
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
                    res.send(JSON.stringify(url.parse(req.url,true).query));
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
    }
}