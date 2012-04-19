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

'use strict';

var Engine = require('../lib/engine');

var engine = new Engine();

module.exports = {
    'undefined': function(test) {
        // In this test, two of the columns are not present.
        var script = 'a = [{"id": "10", "value" : "one"},\
                           {"id": "20", "value" : "two"},\
                           {"id": "30", "value" : "three"}];\
                      b = [{"id": 10, "value" : "eno"},\
                           {"id": 20, "value" : "owt"},\
                           {"id": 30, "value" : "eerht"}];\
                      return select a.id as aid, b.id as bid, a.value as av, b.value as bv, a.blah as ablah, b.blah as bblah from a as a, b as b where a.id = b.id;';
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack);
                    test.done();
                }
                else {
                    test.equal(result.body.length, 3);
                    for(var i = 0; i < result.body.length; i++) {
                        test.ok(result.body[i].hasOwnProperty('aid'));
                        test.ok(result.body[i].hasOwnProperty('bid'));
                        test.ok(result.body[i].hasOwnProperty('av'));
                        test.ok(result.body[i].hasOwnProperty('bv'));
                        test.ok(result.body[i].hasOwnProperty('aid'));
                        test.ok(!result.body[i].ablah);
                        test.ok(!result.body[i].bblah);
                    }
                    test.done();
                }
            });
        });
    }
};
