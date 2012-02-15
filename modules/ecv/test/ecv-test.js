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
    os = require('os'),
    ecv = require('../lib/ecv.js'),
    Console = require('ql.io-console');

var port = 9091;
var hostname = os.hostname();


module.exports = testCase({
    'check ecv': function(test) {
        var c = new Console({
            'enable console': false,
            connection: 'close'
        });
        ecv.enable(c.app, port);
        c.app.listen(port, function() {
            // Regex to match the expected response. Tricky part is the IPv4 match.
            // Very naive exp to check numbers 0 - 255.
            // (25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]? ) -> ( numbers 250 to 255 | numbers 200 to 249 | numbers 0 to 199)
            // Same expression for each of the 4 IPs
            var re = new RegExp('status=AVAILABLE&ServeTraffic=true&ip=(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)&hostname='+hostname+'&port=' + port + '&time=.*');
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
                    res.on('end', function () {
                        var result = re.exec(response);
                        test.ok(result !== null,
                            'expected:status=AVAILABLE&ServeTraffic=true&ip=<Network IP>&hostname=' + hostname + '&port=' + port + '&time=.*');
                        test.ok(result[1] !== 127, 'Network Ip expected. Got a loopback/localhost address');
                        test.done();
                        c.app.close();
                    });
                });
                request.on('error', function(err) {
                    console.log('Error with uri - ' + request.uri + ' - ' + err.message);
                });
                request.end();
            }
            catch(e) {
                console.log(e);
                test.ok(false);
            }
        });
    },
    'check ecv without /q': function(test) {
        var c = new Console({
            'enable console': false,
            'enable q': false,
            connection: 'close'
        });
        ecv.enable(c.app, port);
        c.app.listen(port, function() {
            // Regex same as above.
            var re = new RegExp('status=AVAILABLE&ServeTraffic=true&ip=(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)&hostname='+hostname+'&port=' + port + '&time=.*');
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
                        var result = re.exec(response);
                        test.ok(result !== null,
                            'expected:status=AVAILABLE&ServeTraffic=true&ip=<Network IP>&hostname='+hostname+'&port=' + port + '&time=.*');
                        test.ok(result[1] !== 127, 'Network Ip expected. Got a loopback/localhost address');
                        test.done();
                        c.app.close();
                    });
                });
                request.on('error', function(err) {
                    console.log('Error with uri - ' + request.uri + ' - ' + err.message);
                });
                request.end();
            }
            catch(e) {
                console.log(e);
                test.ok(false);
            }
        });
    }
});
