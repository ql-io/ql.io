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
    'expr?': function(test) {
        var script = 'obj = {\
                                "prop" : [\
                                    {"name": "A", "price": "1.95"},\
                                    {"name": "B", "price": "2.95"},\
                                    {"name": "C", "price": "3.95"}\
                                ]\
                        };\
                      return "{obj.prop[?(@.price > 2)]}";';
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack);
                    test.done();
                }
                else {
                    test.equal(result.body.length, 2);
                    test.equal(result.body[0].name, 'B');
                    test.equal(result.body[0].price, '2.95');
                    test.equal(result.body[1].name, 'C');
                    test.equal(result.body[1].price, '3.95');
                    test.done();
                }
            });
        });
    }
};
