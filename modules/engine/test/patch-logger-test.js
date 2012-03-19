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
    eventTypes = require('../lib/engine/event-types.js');

module.exports = {
    'patch body': function (test) {
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
            var error = 0, warn = 0, info = 0;
            // Do the test here.
            var engine = new Engine({
                tables: __dirname + '/patch'
            });

            engine.on(Engine.Events.ERROR, function(event, message, err) {
                if('Something went wrong' === message) {
                    ++error;
                }
            });

            engine.on(Engine.Events.WARNING, function(event, message, err) {
                if('Watch out' === message) {
                    ++warn;
                }
            });

            engine.on(Engine.Events.EVENT, function(event, message, err) {
                if('Something to note' === message) {
                    ++info;
                }
            });
            engine.execute('select * from logger.patch', function (emitter) {

                emitter.on('end', function (err, result) {
                    if(err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    test.ok(error === 1, "One ERROR event expected");
                    test.ok(warn === 1, "One WARNING event expected");
                    test.ok(info === 1, "One INFO event expected");
                    test.done();
                    server.close();
                });
            });
        });
    }
};