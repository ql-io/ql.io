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


var fs = require('fs'),
    Engine = require('../lib/engine'),
    zlib = require('zlib'),
    http = require('http');

module.exports = {
    'gzip-test':function (test) {
        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock' + req.url;
            var readStream = fs.createReadStream(file);
            res.writeHead(200, {
                'Content-Type':file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Encoding':'gzip'
            });
            readStream.pipe(zlib.createGzip()).pipe(res);
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/finditems.ql', 'UTF-8');
            engine.execute(
                script,
                function (emitter) {
                    emitter.on('end', function (err, results) {
                        if (err) {
                            console.log(err.stack || err);
                            test.ok(false);
                        }
                        else {
                            test.ok(results.body.length > 0, "Response has no body");
                        }
                        test.done();
                        server.close();
                    });
                });
        });
    },
    'deflate-test':function (test) {
        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock' + req.url;
            var readStream = fs.createReadStream(file);
            res.writeHead(200, {
                'Content-Type':file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Encoding':'deflate'
            });
            readStream.pipe(zlib.createDeflate()).pipe(res);
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/finditems.ql', 'UTF-8');
            engine.execute(
                script,
                function (emitter) {
                    emitter.on('end', function (err, results) {
                        if (err) {
                            console.log(err.stack || err);
                            test.ok(false);
                        }
                        else {
                            test.ok(results.body.length > 0, "Response has no body");
                        }
                        test.done();
                        server.close();
                    });
                });
        });
    },
    'gzip-unsupported-encoding-test':function (test) {
        var snappy = 'snappy2';
        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock' + req.url;
            res.writeHead(200, {
                'Content-Type':file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Encoding':snappy
            });
            var buffer = "Hello World";
            res.write(buffer);
            res.end();
        });

        server.listen(3000, function () {
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/finditems.ql', 'UTF-8');
            engine.execute(
                script,
                function (emitter) {
                    emitter.on('end', function (err, results) {
                        if (err) {
                            test.ok(err.message && err.message.indexOf(snappy) > 0, "Expected message not thrown");
                            test.ok(err.status == 502);
                        }
                        else {
                            test.ok(false, "Unsupported content encoding error must be thrown");
                        }
                        test.done();
                        server.close();
                    });
                });
        });
    }
    // TODO add test case for corrupted stream
};