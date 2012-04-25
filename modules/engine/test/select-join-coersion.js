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
    'return-string': function(test) {
        var script = 'a = [\
          {"id": "1", "value" : "one"},\
          {"id": "2", "value" : "two"},\
          {"id": "3", "value" : "three"}];\
        b = [\
          {"id": 1, "value" : "eno"},\
          {"id": 2, "value" : "owt"},\
          {"id": 3, "value" : "eerht"}];\
        return select a.value, b.value from a as a, b as b where a.id = b.id;'
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack);
                    test.done();
                }
                else {
                    test.equal(result.body.length, 3);
                    test.done();
                }
            });
        });
    }
};
