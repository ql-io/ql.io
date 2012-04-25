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
    util = require('util'),
    Listener = require('./utils/log-listener.js');

// Test that multiple post requests can be scattered
// Usage: using bodyTemplate 'template' type 'foo/bar' foreach 'baz'
module.exports = {
    'multi-post': function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            util.pump(req, res, function (e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables: __dirname + '/scatter-post'
            });
            var listener = new Listener(engine);
            engine.execute('select * from scatter.post where id in ("1", "2", "3")', function (emitter) {
                emitter.on('end', function (err, result) {
                    listener.assert(test);
                    if(err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.deepEqual(result.body, [ { id: '1' }, { id: '2' }, { id: '3' } ]);
                        test.done();
                    }
                    server.close();
                });
            });
        });
    }
};