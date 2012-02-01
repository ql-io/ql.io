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
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    fs = require('fs'),
    util = require('util');

module.exports = {
    'find-all' : function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
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
            // Do the test here.
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/find-all.ql', 'UTF-8');
            engine.exec(script, function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.ok(results.i1);
                    test.ok(results.i2);
                    test.ok(results.ids);
                    var i1 = _.sortBy(results.i1, function(id) {
                        return id;
                    });
                    i1 = _.unique(i1);
                    var i2 = _.sortBy(results.i2, function(id) {
                        return id;
                    });
                    i2 = _.unique(i2);
                    var ids = _.sortBy(results.ids, function(id) {
                        return id;
                    });
                    ids = _.unique(ids);
                    test.equals(i1.length + i2.length, ids.length);

                    test.equals(results.txb.length, 2);
                    test.equals(results.txs.length, 2);
                    test.ok(results.be === undefined);
                    test.ok(results.se === undefined);
                    test.done();
                }
                server.close();

            });
        });
    },

    'find-all-flatten' : function(test) {
            // Start a file server
            var server = http.createServer(function(req, res) {
                var file = __dirname + '/mock/' + req.url;
                var stat = fs.statSync(file);
                res.writeHead(200, {
                    'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
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
                // Do the test here.
                var engine = new Engine({
                });
                var script = fs.readFileSync(__dirname + '/mock/find-all-flatten.ql', 'UTF-8');
                engine.exec(script, function(err, results) {
                    if(err) {
                        console.log(err.stack || err);
                        test.ok(false, 'Grrr');
                        test.done();
                    }
                    else {
                        results = results.body;
                        test.ok(_.isArray(results));
                        test.equals(results.length, 32);
                        test.done();
                    }
                    server.close();
                });
            });
        }
}