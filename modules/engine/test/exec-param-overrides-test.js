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

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    sys = require('sys'),
    http = require('http'),
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    connection : 'close'
});

module.exports = {
    // Test staging config, but pass a request param to override
    'test-req-param': function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var parsed = require('url').parse(req.url)
            var body = {
                query: parsed.query
            }
            res.writeHead(200, {
                'Content-Type' : 'text/plain'
            });
            res.end(JSON.stringify(body));
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
                connection : 'close'
            });
            var script = 'create table myapi \
                            on select get from "http://localhost:3000/myapi?param={value}";\
                          return select * from myapi where value = myval;';
            engine.exec(script, function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.equals(results.query, 'param=myval');
                    test.done();
                }
                server.close();

            });
        });
    },

    'test-req-param-override': function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var parsed = require('url').parse(req.url)
            var body = {
                query: parsed.query
            }
            res.writeHead(200, {
                'Content-Type' : 'text/plain'
            });
            res.end(JSON.stringify(body));
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
                connection : 'close'
            });
            var script = 'create table myapi \
                            on select get from "http://localhost:3000/myapi?param={value}";\
                          return select * from myapi';
            engine.exec({
                script: script,
                request: {
                    params: {
                        value: 'myParamOverride'
                    }
                },
                cb: function(err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        test.ok(false, 'Grrr');
                        test.done();
                    }
                    else {
                        results = results.body;
                        test.equals(results.query, 'param=myParamOverride');
                        test.done();
                    }
                    server.close();

                }
            });
        });
    },

    'test-req-param-override-undefined': function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var parsed = require('url').parse(req.url)
            var body = {
                query: parsed.query
            }
            res.writeHead(200, {
                'Content-Type' : 'text/plain'
            });
            res.end(JSON.stringify(body));
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
                connection : 'close'
            });
            var script = 'create table myapi \
                            on select get from "http://localhost:3000/myapi?param={value}";\
                      return select * from myapi where value = "{val}"';
            engine.exec({
                script: script,
                request: {
                    params: {
                        value: 'myParamOverride'
                    }
                },
                cb: function(err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        test.ok(false, 'Grrr');
                        test.done();
                    }
                    else {
                        results = results.body;
                        test.equals(results.query, 'param=myParamOverride');
                        test.done();
                    }
                    server.close();
                }
            });
        });
    },

    'test-header-override': function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var parsed = require('url').parse(req.url)
            var body = {
                query: parsed.query
            }
            res.writeHead(200, {
                'Content-Type' : 'text/plain'
            });
            res.end(JSON.stringify(body));
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
                connection : 'close'
            });
            var script = 'create table myapi \
                            on select get from "http://localhost:3000/myapi?param={value}";\
                          return select * from myapi';
            engine.exec({
                script: script,
                request: {
                    headers: {
                        value: 'myHeaderOverride'
                    }
                },
                cb: function(err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        test.ok(false, 'Grrr');
                        test.done();
                    }
                    else {
                        results = results.body;
                        test.equals(results.query, 'param=myHeaderOverride');
                        test.done();
                    }
                    server.close();

                }
            });
        });
    },

    'test-header-override-undefined': function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var parsed = require('url').parse(req.url)
            var body = {
                query: parsed.query
            }
            res.writeHead(200, {
                'Content-Type' : 'text/plain'
            });
            res.end(JSON.stringify(body));
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
                connection : 'close'
            });
            var script = 'create table myapi \
                            on select get from "http://localhost:3000/myapi?param={value}";\
                          return select * from myapi where value = "{val}"';
            engine.exec({
                script: script,
                request: {
                    headers: {
                        value: 'myHeaderOverride'
                    }
                },
                cb: function(err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        test.ok(false, 'Grrr');
                        test.done();
                    }
                    else {
                        results = results.body;
                        test.equals(results.query, 'param=myHeaderOverride');
                        test.done();
                    }
                    server.close();

                }
            });
        });
    }
}
