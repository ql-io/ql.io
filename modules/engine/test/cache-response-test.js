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

var Engine = require('../lib/engine'),
    Listener = require('./utils/log-listener.js'),
    http = require('http'),
    fs = require('fs'),
    util = require('util');

module.exports = {
    'patch-compute cache json':function (test) {
        var counter = 1;

        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type':'application/json'
            });
            res.end(JSON.stringify({'counter':counter}));
            counter++;
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables:__dirname + '/cache',
                cache:new mockCache()
            });
            var script = "select * from patch.compute.key";

            var listener = new Listener(engine);
            engine.exec(script, function (err, result) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                    server.close();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.deepEqual(result.body, {counter:1});
                    engine.exec(script, function (err, result) {
                        if (err) {
                            console.log(err.stack || util.inspect(err, false, 10));
                            test.fail('got error');
                            test.done();
                        }
                        else {
                            test.equals(result.headers['content-type'], 'application/json', 'json expected');
                            test.deepEqual(result.body, {counter:1});
                            test.done();
                        }
                        server.close();
                    });
                }
            });
        });
    },
    'cache xml':function (test) {
        var counter = 1;

        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type':'application/xml'
            });
            res.end('<counter>' + counter + '</counter>');
            counter++;
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables:__dirname + '/cache',
                cache:new mockCache()
            });
            var script = "select * from patch.compute.key";

            var listener = new Listener(engine);
            engine.exec(script, function (err, result) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                    server.close();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.deepEqual(result.body, {counter:1});
                    engine.exec(script, function (err, result) {
                        if (err) {
                            console.log(err.stack || util.inspect(err, false, 10));
                            test.fail('got error');
                            test.done();
                        }
                        else {
                            test.equals(result.headers['content-type'], 'application/json', 'json expected');
                            test.deepEqual(result.body, {counter:1});
                            test.done();
                        }
                        server.close();
                    });
                }
            });
        });
    },
    'cache empty':function (test) {
        var counter = 1;

        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type':'application/xml'
            });
            res.end("");
            test.equals(counter, 1, "This should execute only once and pass");
            counter++;
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables:__dirname + '/cache',
                cache:new mockCache()
            });
            var script = "select * from patch.compute.key";
            var listener = new Listener(engine);
            engine.exec(script, function (err, result) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                    server.close();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.deepEqual(result.body, {});
                    engine.exec(script, function (err, result) {
                        if (err) {
                            console.log(err.stack || util.inspect(err, false, 10));
                            test.fail('got error');
                            test.done();
                        }
                        else {
                            test.equals(result.headers['content-type'], 'application/json', 'json expected');
                            test.deepEqual(result.body, {});
                            test.done();
                        }
                        server.close();
                    });
                }
            });
        });
    },
    'cache csv with headers':function (test) {
        var counter = 1;
        // Start a file server
        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock/smallSample.csv';
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type':'text/csv;header',
                'Content-Length':stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function (e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
            test.equals(counter, 1, "This should execute only once and pass");
            counter++;
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables:__dirname + '/cache',
                cache:new mockCache()
            });
            var script = "select * from patch.compute.key";

            var listener = new Listener(engine);
            engine.exec(script, function (err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                }
                else {
                    results = results.body;
                    test.deepEqual(results, [
                        { id:'1', lastname:'Dow', firstname:'John' },
                        { id:'101',
                            lastname:'AnotherDow',
                            firstname:'Jane' }
                    ]);
                    engine.exec(script, function (err, results) {
                        if (err) {
                            console.log(err.stack || err);
                            test.ok(false, 'Grrr');
                            test.done();
                        }
                        else {
                            results = results.body;
                            test.deepEqual(results, [
                                { id:'1', lastname:'Dow', firstname:'John' },
                                { id:'101',
                                    lastname:'AnotherDow',
                                    firstname:'Jane' }
                            ]);
                            test.done();
                        }
                        server.close();
                    });
                }
            });
        });
    },
    'cache csv without headers':function (test) {
        var counter = 1;
        // Start a file server
        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock/smallSample.csv';
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type':'text/csv',
                'Content-Length':stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function (e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
            test.equals(counter, 1, "This should execute only once and pass");
            counter++;
       });
        server.listen(3000, function () {
            // Do the test here.
            // Do the test here.
            var engine = new Engine({
                tables:__dirname + '/cache',
                cache:new mockCache()
            });
            var script = "select * from patch.compute.key";
            var listener = new Listener(engine);
            engine.exec(script, function (err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                }
                else {
                    results = results.body;
                    test.deepEqual(results, [
                        [ 'id', 'lastname', 'firstname' ],
                        [ '1', 'Dow', 'John' ],
                        [ '101', 'AnotherDow', 'Jane' ]
                    ]);
                    engine.exec(script, function (err, results) {
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
                }
            });
        });
    },
    'cache csv utf-8 csv':function (test) {
        var counter = 1;
        // Start a file server
        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock/utf-8-demo.csv';
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type':'text/csv;charset=utf-8',
                'Content-Length':stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function (e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
            test.equals(counter, 1, "This should execute only once and pass");
            counter++;
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables:__dirname + '/cache',
                cache:new mockCache()
            });
            var script = "select * from patch.compute.key";
            var listener = new Listener(engine);
            engine.exec(script, function (err, results) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
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
                    engine.exec(script, function (err, results) {
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
                }
            });
        });
    },
    'auto-compute cache json':function (test) {
        var counter = 1;

        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type':'application/json'
            });
            res.end(JSON.stringify({'counter':counter}));
            counter++;
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables:__dirname + '/cache',
                cache:new mockCache()
            });
            var script = "select * from auto.compute.key";

            var listener = new Listener(engine);
            engine.exec(script, function (err, result) {
                listener.assert(test);
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                    server.close();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.deepEqual(result.body, {counter:1});
                    engine.exec(script, function (err, result) {
                        if (err) {
                            console.log(err.stack || util.inspect(err, false, 10));
                            test.fail('got error');
                            test.done();
                        }
                        else {
                            test.equals(result.headers['content-type'], 'application/json', 'json expected');
                            test.deepEqual(result.body, {counter:1});
                            test.done();
                        }
                        server.close();
                    });
                }
            });
        });
    }
}

function mockCache() {
    var theCache = {};
    this.put = function (key, data, duration, cb) {
        cb = cb || function (err, result) {
        };

        if (!key) {
            cb({message:'No key specified'})
        }

        theCache[key] = data;

        cb(null, {message:'success', data:true});
    }


    this.get = function (key, cb) {
        cb = cb || function (err, result) {
        };

        var result = theCache[key];

        if (result === undefined) {
            return cb(null, {message:'success', data:false});
        }

        cb(null, {message:'success', data:result});
    }
}