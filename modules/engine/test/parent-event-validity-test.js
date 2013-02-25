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
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    util = require('util'),
    fs = require('fs'),
    eventTypes = require('../lib/engine/event-types.js');

module.exports = {
    'parent-event-fowarding':function (test) {
        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type':'application/json',
                'Content-Length':stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function (e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function () {
            var engine = new Engine({
                tables:__dirname + '/tables',
                config:__dirname + '/config/dev.json'
            });
            var script = fs.readFileSync(__dirname + '/mock/eng-emit2.ql', 'UTF-8');

            var parentEvent = engine.beginEvent({
                parent:undefined,
                name:'wrapper',
                message:'wrapper',
                cb:function (err, results) {
                }
            });

            var eventIdOne = 0, parentEventIdZero = 0;

            engine.on(Engine.Events.BEGIN_EVENT, function (event, message) {
                if (event.eventId == 1) { // If one condition is true then likely the next one will also be true
                                          // This could happend if parent events are not propogated properly
                    eventIdOne++;
                }
                if (event.parentEventId == 0) {
                    parentEventIdZero++;
                }
            });

            engine.on(Engine.Events.END_EVENT, function (event, message) {
                if (event.eventId == 1) {
                    eventIdOne++;
                }
                if (event.parentEventId == 0) {
                    parentEventIdZero++;
                }
            });


            engine.execute(script, {parentEvent:parentEvent.event}, function (emitter) {
                emitter.on('end', function (err, result) {
                    if (err) {
                        test.ok(false, "Unexepected error");
                        test.done();
                        server.close();
                    }
                    else {
                        test.ok(!eventIdOne, "1 is unexpected event id");
                        test.ok(parentEventIdZero == 4, "4 is unexpected parent event id");
                        test.done();
                        server.close();
                    }
                });
            });
        });
    }
};