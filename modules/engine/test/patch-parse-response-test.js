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
    'parse response': function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/binary'
            });
            res.write(new Buffer('[{"message": "one"},', 'UTF-8'));
            res.write(new Buffer('{"message": "two"},', 'UTF-8'));
            res.write(new Buffer('{"message": "three"}]', 'UTF-8'));
            res.end();
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables: __dirname + '/patch'
            });
            engine.execute('select * from parse.response', function (emitter) {
                emitter.on('end', function (err, result) {
                    if(err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.deepEqual(result.body, [{message: 'one'},{message: 'two'},{message: 'three'}]);
                        test.done();
                    }
                    server.close();
                });
            });
        });
    }
};
