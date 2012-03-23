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

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    http = require('http'),
    fs = require('fs'),
    util = require('util'),
    Listener = require('./utils/log-listener.js');

module.exports = {
    'select from csv with headers' : function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'text/csv;header',
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
            // Do the test here.
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/csvSelect.ql', 'UTF-8');
            var listener = new Listener(engine);
            engine.exec(script, function(err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.deepEqual(results, [
                        { id: '1', lastname: 'Dow', firstname: 'John' },
                        { id: '101',
                            lastname: 'AnotherDow',
                            firstname: 'Jane' }
                    ]);
                    test.done();
                }
                server.close();

            });
        });
    },
    'select from csv without headers' : function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'text/csv',
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
            // Do the test here.
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/csvSelect.ql', 'UTF-8');
            var listener = new Listener(engine);
            engine.exec(script, function(err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.deepEqual(results, [
                        [ 'id', 'lastname', 'firstname' ],
                        [ '1', 'Dow', 'John' ],
                        [ '101', 'AnotherDow', 'Jane' ]
                    ]);
                    test.done();
                }
                server.close();

            });
        });
    },
    'select from utf-8 csv' : function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'text/csv;charset=utf-8',
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
            // Do the test here.
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/utf8csvSelect.ql', 'UTF-8');
            var listener = new Listener(engine);
            engine.exec(script, function(err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.ok(results.length === 4, "Array of length 4 expected");
                    if (results.length === 4) {
                        test.ok(results[0].length === 5, "Array of length 5 expected");
                        test.ok(results[1].length === 9, "Array of length 9 expected");
                        test.ok(results[2].length === 7, "Array of length 7 expected");
                        test.ok(results[3].length === 3, "Array of length 3 expected");
                    }
                    test.done();
                }
                server.close();

            });
        });
    }
}