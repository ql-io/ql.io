/*
 * Copyright 2012 eBay Software Foundation
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
    util = require('util');

module.exports = {
    'udf-patch-params': function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            var uri = 'http://localhost:3000/q?testValue=TESTVALUE';
            if(req.headers['x-uri'] && req.headers['x-uri'] === uri) {
                res.writeHead(200);
            }
            else {
                res.writeHead(403);
            }
            res.end(JSON.stringify({'path': req.url}));
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables: __dirname + '/patch'
            });
            engine.execute('select * from udf.patch.params where testValue("test")', function (emitter) {
                emitter.on('end', function (err, result) {
                    if(err) {
                        console.log('err');
                        console.log(err.stack || err);
                        console.log('err');
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.equals(result.body.path, '/q?testValue=TESTVALUE');
                        test.done();
                    }
                    server.close();
                });
            });
        });
    }
};