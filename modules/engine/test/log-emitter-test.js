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

var Engine = require('../lib/engine');



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
    }
};