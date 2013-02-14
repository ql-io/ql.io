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

"use strict";

var Engine = require('../lib/engine'),
    http = require('http');


module.exports = {
    'route' : function(test){
        var engine = new Engine({
            tables : __dirname + '/mock-routes/tables',
            routes : __dirname + '/mock-routes/routes',
            config : __dirname + '/config/dev.json'
        });
        var q = 'describe route "/foo/bar/{selector}?userid={userId}&itemid={itemId}" using method get';
        var eventMap = {
            begin:0,
            end:0
        }
        engine.execute(q, {},
            function(emitter) {
                var step_num = 0;
                engine.on('ql.io-end-event',function(){
                    eventMap.begin += 1
                })
                engine.on('ql.io-begin-event',function(){
                    eventMap.end += 1
                })
                emitter.on('end', function(err, results) {
                    test.equals(eventMap.begin, 1);
                    test.equals(eventMap.end, 1)
                    test.done();
                });
            }, true);
    },
    'auth-ok': function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({'message': 'ok'}));
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables: __dirname + '/auth'
            });
            var events = []
            engine.execute('select * from auth.plugin where ok = "ok"', function (emitter) {
                engine.on('ql.io-event',function(event){
                    events.push(event)
                })
                engine.on('ql.io-begin-event',function(event){
                    events.push(event)
                })
                engine.on('ql.io-end-event',function(event){
                    events.push(event)
                })
                emitter.on('end', function (err, result) {
                    if(err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(events.length, 13)
                        test.equals(events[4].name,'http-request')
                        test.equals(events[5].name,'processingEvent')
                        test.equals(events[6].name,'http-request')
                        test.equals(events[7].name,'processingEvent')
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.equals(result.body.message, 'ok');
                        test.done();
                    }
                    server.close();
                });
            });
        });
    }
};