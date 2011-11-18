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
    'check repl politeShutdown': function(test) {
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
        }, 1800);

        var testInterval = setInterval(function() {
            var replSocket = new net.Socket();
            var rplData = '';
            var smData = {
                init: function(data) {
                    test.equal('cluster> ', data.toString());
                    onData = smData.politeShutdown;
                    replSocket.write('politeShutdown()\r\n')
                },
                politeShutdown: function(data) {
                    rplData += data;
                }
            };
            var onData = smData.init;
            replSocket.on('data', function(data) {
                (onData)(data);
            });
            replSocket.on('close', function() {
                test.ok(rplData.toString().search('Will Shutdown When all connections close') > -1,
                    'Did not get the expected message:Will Shutdown When all connections close\r\n' +
                        'Got:' + rplData);
                replSocket.destroy();
            });
            replSocket.connect(3038, 'localhost');
            done = true;
            clearInterval(testInterval);
        }, 800);
    }
});
