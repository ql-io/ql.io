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
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    http = require('http'),
    fs = require('fs');

var engine = new Engine({
    config: __dirname + '/config/dev.json'
});

module.exports = {
    'select-header-fill': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
        var script = fs.readFileSync(__dirname + '/mock/select-header-fill.ql', 'UTF-8');
        var emitter = new EventEmitter();
        var headers;
        emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
            headers = v.headers;
        });

        engine.exec({
            script: script,
            emitter: emitter,
            cb: function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.ok(value);
                    test.equals(value, 'BAR');
                    test.done();
                    server.close();
                }
            }
        });
        });
    },

    'select-header-leave': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
        var script = fs.readFileSync(__dirname + '/mock/select-header-leave.ql', 'UTF-8');
        var emitter = new EventEmitter();
        var headers;
        emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
            headers = v.headers;
        });

        engine.exec({
            script: script,
            emitter: emitter,
            cb: function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.equal(value, '');
                    test.done();
                    server.close();
                }
            }
        });
        });
    },

    'select-header-fill-from-defaults': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
        var script = fs.readFileSync(__dirname + '/mock/select-header-default.ql', 'UTF-8');
        var emitter = new EventEmitter();
        var headers;
        emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
            headers = v.headers;
        });

        engine.exec({
            script: script,
            emitter: emitter,
            cb: function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.ok(value);
                    test.equals(value, 'foo-default');
                    test.done();
                    server.close();
                }
            }
        });
        });
    },

    'select-header-fill-from-headers': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
        var script = fs.readFileSync(__dirname + '/mock/select-header-from-header.ql', 'UTF-8');
        var emitter = new EventEmitter();
        var headers;
        emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
            headers = v.headers;
        });

        engine.exec({
            script: script,
            emitter: emitter,
            request: {
                headers: {
                    'foo' : 'foo-header'
                }
            },
            cb: function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.ok(value);
                    test.equals(value, 'foo-header');
                    test.done();
                    server.close();
                }
            }
        });
        });
    },

    'select-header-fill-from-params': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
        var script = fs.readFileSync(__dirname + '/mock/select-header-params.ql', 'UTF-8');
        var emitter = new EventEmitter();
        var headers;
        emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
            headers = v.headers;
        });

        engine.exec({
            script: script,
            emitter: emitter,
            request: {
                params: {
                    'foo' : 'foo-param'
                }
            },
            cb: function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.ok(value);
                    test.equals(value, 'foo-param');
                    test.done();
                    server.close();
                }
            }
        });
        });
    }
}
