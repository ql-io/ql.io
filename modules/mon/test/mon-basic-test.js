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

var testCase = require('nodeunit').testCase,
    http = require('http'),
    net = require('net');

module.exports = testCase({
    setUp: function (callback) {
        this.cluster_proc = require('child_process').spawn('test/start.sh');
        this.cluster_proc.stdout.on('data', function (data) {
        });
        callback();
    },
    tearDown: function (callback) {
        this.cluster_proc.kill('SIGTERM');
        callback();
    },
    'check test setup': function (test) {
        test.ok(this.cluster_proc.pid, 'Expected spawn to succeed');
        test.done();
    },
    'check test app': function(test) {
        var interval = setInterval(function() {
            test.ok(false, 'test app does not work');
            test.done();
            clearInterval(interval);
            clearInterval(testInterval);
        }, 10000);

        var testInterval = setInterval(function() {
            try {
                var cl = http.createClient(3036, 'localhost');
                var req = cl.request('GET', '/');
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.equal(data, 'Hello World!');
                        test.done();
                        clearInterval(interval);
                    });
                });
                req.end();
                clearInterval(testInterval);
            }
            catch(e) {
                console.log(e.stack || e);
            }
        }, 6000);
    },
    'check mon html': function(test) {
        var re = new RegExp('<!DOCTYPE html>.*');
        var interval = setInterval(function() {
            test.ok(false, 'test app does not work');
            test.done();
            clearInterval(interval);
            clearInterval(testInterval);
        }, 5000);

        var testInterval = setInterval(function() {
            try {
                var cl = http.createClient(3037, 'localhost');
                var req = cl.request('GET', '/');
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.ok(data.toString().match(re), 'Expected html output got: ' + data.toString());
                        test.done();
                        clearInterval(interval);
                    });
                });
                req.end();
                clearInterval(testInterval);
            }
            catch(e) {
                console.log(e);
            }
        }, 3000);
    },
    'check mon json': function(test) {
        var interval = setInterval(function() {
            test.ok(false, 'test app does not work');
            test.done();
            clearInterval(interval);
            clearInterval(testInterval);
        }, 5000);

        var testInterval = setInterval(function() {
            try {
                var options = {
                    host: 'localhost',
                    port: 3037,
                    path: '/',
                    headers:{
                        accept: 'application/json'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        try {
                            var json = JSON.parse(data);
                            test.ok(json.master, 'missing master data');
                            if (json.master) {
                                var fields = ['host',
                                    'os',
                                    'state',
                                    'started',
                                    'averageLoad',
                                    'coresUsed',
                                    'memoryUsageAtBoot',
                                    'totalMem',
                                    'currentMemoryUsage',
                                    'hostCpu',
                                    'restarts',
                                    'workersKilled'];
                                fields.forEach(function(field) {
                                    test.ok(json.master[field] != undefined, 'Missing field in master:' + field);
                                });
                            }
                            test.ok(json.workers, 'missing data for workers');
                            if (json.workers) {
                                json.workers.forEach(function(worker) {
                                    var fields = ['start',
                                        'connectionsTotal',
                                        'connectionsActive',
                                        'requestsTotal',
                                        'totalProcMemoryWithSwap',
                                        'totalProcMemoryWithoutSwap',
                                        'memoryHeapAvailablToV8Engine',
                                        'memoryHeapUsedByV8Engine'
                                    ]
                                    fields.forEach(function(field) {
                                        test.ok(worker[field] != undefined, 'Missing field in worker:' + field);
                                    });
                                });
                            }
                        }
                        catch(e) {
                            test.ok(false, 'failure parsing mon json');
                        }
                        test.done();
                        clearInterval(interval);
                    });
                });
                req.end();
                clearInterval(testInterval);
            }
            catch(e) {
                console.log(e);
            }
        }, 3000);
    },
    'check mon repl': function(test) {
        var interval = setInterval(function() {
            test.ok(false, 'test app does not work');
            test.done();
            clearInterval(interval);
            clearInterval(testInterval);
        }, 5000);
        var testInterval = setInterval(function() {
            var replSocket = new net.Socket();
            var monData = '';
            var smData = {
                init: function(data) {
                    test.equal('cluster> ', data.toString());
                    onData = smData.mon;
                    replSocket.write('mon()\r\n')
                },
                mon: function(data) {
                    monData += data;
                    if (monData.search('cluster') > -1) {
                        test.ok(monData.search('Worker: 0') > -1,'mon info not returned by repl');
                        replSocket.destroy();
                        test.done();
                        clearInterval(interval);
                    }
                }
            };
            var onData = smData.init;
            replSocket.on('data', function(data) {
                (onData)(data);
            });
            replSocket.connect(3038, 'localhost');
            clearInterval(testInterval);
        }, 3000);
    }
});
