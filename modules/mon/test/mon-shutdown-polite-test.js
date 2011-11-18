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
        callback();
    },
    'test polite shutdown': function(test) {
        var done = false;
        var interval = setInterval(function() {
            var testServer = net.createServer();
            try {
                testServer.listen(3036, 'localhost', function() {
                });
                testServer.close();
            }
            catch(e) {
                test.ok(false, 'Expected port 3036 to be available.');
            }
            clearInterval(interval);
            test.ok(done, 'Core test logic did not finish');
            if (!done) {
                clearInterval(testInterval);
            }
            test.done();
        }, 800);

        var testInterval = setInterval(function() {
            try {
                var cl = http.createClient(3037, 'localhost');
                var req = cl.request('GET', '/shutdown/polite');
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.equal(data, 'Server will shutdown when all connections close!');
                    });
                });
                req.end();
                done = true;
                clearInterval(testInterval);
            }
            catch(e) {
                console.log(e);
            }
        }, 500);
    }
});
