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

process.on('uncaughtException', function(e) {
//    TODO: Not clear why async.js throws the TypeError
//    console.log(e.stack || e);
});

var fs = require('fs'),
    Engine = require('../lib/engine'),
    async = require('async'),
    http = require('http');

module.exports = {
    // Default timeout is 10 sec
    'default-timeout-test':function (test) {
        var server = http.createServer(function (req, res) {
            setTimeout(function() {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    'message': 'ok'
                }));

            }, 15000);
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout on select get from "http://localhost:3000/"\nreturn select * from timeout;';
            engine.execute(
                script,
                function (emitter) {
                    emitter.on('end', function (err, results) {
                        if (err) {
                            // Timeout as expected
                            test.ok(true);
                        }
                        else {
                            test.ok(false, "Did not fail");
                        }
                        server.close();
                        test.done();
                    });
                });
        });
    },

    'set-timeout-test': function (test) {
        var server = http.createServer(function (req, res) {
            setTimeout(function () {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    'message': 'ok'
                }));

            }, 500);
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout on select get from "http://localhost:3000/"\nreturn select * from timeout timeout 100;';
            engine.execute(
                script,
                function (emitter) {
                    emitter.on('end', function (err, results) {
                        if(err) {
                            // Timeout as expected
                            test.ok(true);
                        }
                        else {
                            test.ok(false, "Did not fail");
                        }
                        server.close();
                        test.done();
                    });
                });
        });
    },

    'retries-below-threshold': function (test) {
        var attempt = 0;
        var server = http.createServer(function (req, res) {
            attempt++;
            if(attempt < 4) {
                setTimeout(function () {
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        'message': 'ok'
                    }));
                }, 500);
            }
            else {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    'message': 'ok'
                }));
            }
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout on select get from "http://localhost:3000/"\nreturn select * from timeout timeout 100;';

            var fails = 0, passes = 0;
            function send(callback) {
                engine.execute(
                    script,
                    function (emitter) {
                        emitter.on('end', function (err, results) {
                            if(err) {
                                fails++;
                            }
                            else {
                                passes++;
                            }
                            callback(null, {passes: passes, fails: fails});
                        });
                    });
            }

            async.series([send, send, send, send], function (err, results) {
                test.equals(results.length, 4);
                test.equals(results[3].passes, 3); // three failures
                test.equals(results[3].fails, 1); // no success
                server.close();
                test.done();
            })
        });
    },

    'retries-above-threshold': function (test) {
        var attempt = 0;
        var server = http.createServer(function (req, res) {
            attempt++;
            if(attempt < 3) {
                setTimeout(function () {
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        'message': 'ok'
                    }));
                }, 500);
            }
            else {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    'message': 'ok'
                }));
            }
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout on select get from "http://localhost:3000/"\nreturn select * from timeout timeout 100;';

            var fails = 0, passes = 0;
            function send(callback) {
                engine.execute(
                    script,
                    function (emitter) {
                        emitter.on('end', function (err, results) {
                            if(err) {
                                fails++;
                            }
                            else {
                                passes++;
                            }
                            callback(null, {passes: passes, fails: fails});
                        });
                    });
            }

            async.series([send, send, send, send], function(err, results) {
                test.equals(results.length, 4);
                test.equals(results[3].passes, 4); // three failures
                test.equals(results[3].fails, 0); // no success
                server.close();
                test.done();
            })
        });
    },

    'backoff': function (test) {
        var attempt = 0;
        var server = http.createServer(function (req, res) {
            setTimeout(function () {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    'message': 'ok'
                }));
            }, 500);
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout on select get from "http://localhost:3000/"\nreturn select * from timeout timeout 100;';

            var fails = 0, passes = 0;

            function send(callback) {
                engine.execute(
                    script,
                    function (emitter) {
                        emitter.on('end', function (err, results) {
                            if(err) {
                                fails++;
                            }
                            else {
                                passes++;
                            }
                            callback(null, {passes: passes, fails: fails});
                        });
                    });
            }

            async.series([send, send, send, send], function (err, results) {
                test.equals(results.length, 4);
                test.equals(results[3].passes, 0); // three failures
                test.equals(results[3].fails, 4); // no success
                server.close();
                test.done();
            })
        });
    }
};