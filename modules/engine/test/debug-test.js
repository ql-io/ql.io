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

var engine = new Engine();

module.exports = {
    'simple': function(test) {
        var q = 'obj = {"a" : "A", "b" : "B", "c" : "C"}\n\
        foo = select a from obj\n\
        return foo';
        engine.execute(q, {},
            function(emitter) {
                var step_num = 0;

                emitter.on('ql.io-debug', function(packet) {
                    switch (step_num){
                        case 0:
                            test.deepEqual(packet.context, {"obj" : {"a" : "A", "b" : "B", "c" : "C"}});
                            break;
                        case 1:
                            test.deepEqual(packet.context, {"obj" : {"a" : "A", "b" : "B", "c" : "C"}, "foo" : ["A"]});
                            break;
                    }
                    step_num++;
                    engine.debugData[packet.emitterID].emit('ql.io-debug-step');
                });
                emitter.on('end', function(err, results) {
                    test.deepEqual(results.body, ['A']);
                    test.done();
                });
            }, true);
    }
};