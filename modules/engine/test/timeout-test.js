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
            }, 21000);  // Double the default timeout, as there is a 'retry' on timeout
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout1 on select get from "http://localhost:3000/"\nreturn select * from timeout1;';
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
            }, 150);  // More than double the timeout, as there is a 'retry' on timeout
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout2 on select get from "http://localhost:3000/"\nreturn select * from timeout2 timeout 50;';
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

    'timeouts-below-threshold': function (test) {
        var attempt = 0;
        var server = http.createServer(function (req, res) {
            if(attempt < 6) {
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
            attempt++;  // attempt gets incremented on retry too.
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout3 on select get from "http://localhost:3000/"\nreturn select * from timeout3 timeout 100;';

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
                test.equals(results[3].passes, 1);
                test.equals(results[3].fails, 3);
                server.close();
                test.done();
            })
        });
    },

    'retries-above-threshold': function (test) {
        var attempt = 0;
        var server = http.createServer(function (req, res) {
            if(attempt < 8) {
                setTimeout(function () {
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    });
                    res.end(JSON.stringify({
                        'message': 'ok'
                    }));
                }, 900);
            }
            else {

                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({
                    'message': 'ok'
                }));
            }
            attempt++;
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout4 on select get from "http://localhost:3000/"\nreturn select * from timeout4 timeout 100;';

            var fails = 0, passes = 0;
            function send(callback) {
                engine.execute(
                    script,
                    function (emitter) {
                        emitter.on('end', function (err, results) {
                            if(err) {
                                fails++;
                                if (fails === 5) {
                                    test.equals(err.message, 'Back-off in progress');
                                }
                            }
                            else {
                                passes++;
                            }
                            callback(null, {passes: passes, fails: fails});
                        });
                    });
            }

            async.series([send, send, send, send, send], function(err, results) {
                test.equals(results.length, 5);
                test.equals(results[4].passes, 0);
                test.equals(results[4].fails, 5); // due to backoff
                server.close();
                test.done();
            })
        });
    },

    'backoff-end': function (test) {
        var attempt = 0;
        var server = http.createServer(function (req, res) {
            if(attempt < 6) {
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
            attempt++;
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table timeout5 on select get from "http://localhost:3000/"\nreturn select * from timeout5 timeout 100 minDelay 100 maxDelay 500;';

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

            async.series([send, send, send, send, send], function (err, results) {
                // Wait till maxDelay
                setTimeout(function() {
                    engine.execute(
                        script,
                        function (emitter) {
                            emitter.on('end', function (err, results) {
                                test.ok(results.body.message === 'ok');
                                // Should pass
                                if(err) {
                                    console.log("OK");
                                    test.ok(false, 'unexpected');
                                }
                                server.close();
                                test.done();

                            });
                        });
                }, 550);
            })
        });
    }
};