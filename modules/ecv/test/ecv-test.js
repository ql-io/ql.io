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

var testCase = require('nodeunit').testCase,
    http = require('http'),
    net = require('net'),
    sys = require('sys'),
    ecv = require('lib/ecv.js'),
    Console = require('ql.io-console');

var port = 3000;

module.exports = testCase({

    setUp: function (callback) {
            c = new Console({
                'enable console': false,
                connection: 'close'
            });
            ecv.enable(c.app, port);
            c.app.listen(port);
            callback();
        }
        ,
        tearDown: function (callback) {
            c.app.close();
            callback();
        },

    'check test app': function(test) {
        var interval = setInterval(function() {
            test.ok(false, 'test app does not work');
            test.done();
            clearInterval(interval);
            clearInterval(testInterval);
        }, 3000);

        var testInterval = setInterval(function() {
            var re = new RegExp('status=AVAILABLE&ServeTraffic=true&ip=127\\.0\\.0\\.1&hostname=localhost&port=' + port +'&time=.*');
            try {
                var options = {
                    host: 'localhost',
                    port: port,
                    path: '/ecv',
                    method: 'GET'
                };
                var request = http.request(options, function(res) {
                    var response = '';
                    res.on('data', function(chunk) {
                         response += chunk;
                    });
                    res.on('end', function() {
                        test.ok(response.toString().match(re),
                                'expected:status=AVAILABLE&ServeTraffic=true&ip=127.0.0.1&hostname=localhost&port=' + port+'&time=.*');
                        test.done();
                        clearInterval(interval);
                    });
                });
                request.on('error', function(err) {
                    console.log('Error with uri - ' + request.uri + ' - ' + err.message);
                });
                request.end();
                clearInterval(testInterval);
            }
            catch(e) {
                console.log(e);
            }
        }, 1000);
    }
});
