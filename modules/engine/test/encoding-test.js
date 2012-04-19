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

var _  = require('underscore'),
    util = require('util'),
    http = require('http'),
    url = require('url'),
    fs = require('fs'),
    Listener = require('./utils/log-listener.js');

var Engine = require('../lib/engine');

module.exports = {
    'default' : function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            var engine = new Engine({ });
            var script = fs.readFileSync(__dirname + '/mock/encodingDefaultSelect.ql', 'UTF-8');
            var listener = new Listener(engine);
            engine.exec(script, function(err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Test failed.');
                    test.done();
                } else {
                    results = results.body;
                    test.ok(results.encodedString.length === 200, "String of length 200 expected");
                    test.done();
                }
                server.close();
            });
        });
    },
    'utf-8' : function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'application/json;charset=utf-8',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            var engine = new Engine({ });
            var script = fs.readFileSync(__dirname + '/mock/encodingUTF8Select.ql', 'UTF-8');
            var listener = new Listener(engine);
            engine.exec(script, function(err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Test failed.');
                    test.done();
                } else {
                    results = results.body;
                    test.ok(results.encodedString.length === 200, "String of length 200 expected");
                    test.done();
                }
                server.close();
            });
        });
    },
    'ucs-2' : function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'application/json;charset=ucs-2',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            var engine = new Engine({ });
            var script = fs.readFileSync(__dirname + '/mock/encodingUCS2Select.ql', 'UTF-8');
            var listener = new Listener(engine);
            engine.exec(script, function(err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Test failed.');
                    test.done();
                } else {
                    results = results.body;
                    test.ok(results.encodedString.length === 200, "String of length 200 expected");
                    test.done();
                }
                server.close();
            });
        });
    },
    'iso-8859-1' : function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'application/json;charset=iso-8859-1',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            var engine = new Engine({ });
            var script = fs.readFileSync(__dirname + '/mock/encodingISO88591Select.ql', 'UTF-8');
            var listener = new Listener(engine);
            engine.exec(script, function(err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Test failed.');
                    test.done();
                } else {
                    results = results.body;
                    test.ok(results.encodedString.length === 121, "String of length 121 expected");
                    test.done();
                }
                server.close();
            });
        });
    },
    'ascii' : function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'application/json;charset=ascii',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            var engine = new Engine({ });
            var script = fs.readFileSync(__dirname + '/mock/encodingASCIISelect.ql', 'UTF-8');
            var listener = new Listener(engine);
            engine.exec(script, function(err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Test failed.');
                    test.done();
                } else {
                    results = results.body;
                    test.ok(results.encodedString.length === 94, "String of length 94 expected");
                    test.done();
                }
                server.close();
            });
        });
    }
}
