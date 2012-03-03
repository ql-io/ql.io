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
    'json-utf8': function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.write('{"message": "?????"}');
            res.end();
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table encoding on select get from "http://localhost:3000/"; return select * from encoding;'
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, result) {
                    if(err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.deepEqual(result.body.message, '?????');
                        test.done();
                    }
                    server.close();
                });
            });
        });
    },

    'csv-utf8': function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'text/csv;header;charset=UTF-8'
            });
            res.write('name,value\nmessage,?????', 'UTF-8');
            res.end();
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var script = 'create table encoding on select get from "http://localhost:3000/"; return select * from encoding;'
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, result) {
                    if(err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.equals(result.body[0].name, 'message');
                        test.equals(result.body[0].value, '?????');
                        test.done();
                    }
                    server.close();
                });
            });
        });
    }
};
