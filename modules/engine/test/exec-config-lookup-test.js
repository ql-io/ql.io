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
    http = require('http'),
    fs = require('fs'),
    util = require('util');

'use strict'

var engine = new Engine({
    tables: __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

module.exports = {
    'config lookup': function(test) {
        var script = 'return "{config.ebay.apikey}";';
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, 'Qlio1a92e-fea5-485d-bcdb-1140ee96527');
                test.done();
            }
        });
    },

    'config from body': function (test) {
        // Start a server
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            req.on('data', function (chunk) {
                res.write(chunk);
            });
            req.on('end', function () {
                res.end();
            });
        });
        server.listen(3000, function () {
            // Do the test here.
            var script = 'select * from jsonbody where foo = 100';
            engine.exec(script, function (err, results) {
                if(err) {
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    test.ok(results.body.key);
                    test.done();
                }
                server.close();

            });
        });
    }
};
