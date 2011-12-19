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

"use strict";

var Engine = require('../lib/engine');

var engine = new Engine();

module.exports = {
    'return string': function(test) {
        var script = 'b = "b"; return b;'
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, 'b');
                test.done();
            }
        });
    },

    'return number': function(test) {
        var script = 'b = 12345; return b;'
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, 12345);
                test.done();
            }
        });
    },
    'return true': function(test) {
        var script = 'b = true; return b;'
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, true);
                test.done();
            }
        });
    },
    'return false': function(test) {
        var script = 'b = false; return b;'
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, false);
                test.done();
            }
        });
    },
    'return arr': function(test) {
        var script = 'b = [1,2,3]; return b;'
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, [1,2,3]);
                test.done();
            }
        });
    },
    'return obj': function(test) {
        var script = 'a = true;\n\
            b = false;\n\
            c = [1,2,3,4];\n\
            d = [1, true, 3, false];\n\
            e = "hello";\n\
            f = {\n\
              "a": "A",\n\
              "b": "B",\n\
              "carr": ["a", "b", "c"]\n\
            };\n\
            g = {};\n\
            return f;';
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, {
                    "a": "A",
                    "b": "B",
                    "carr": [
                        "a",
                        "b",
                        "c"
                    ]
                });
                test.done();
            }
        });
    }
};
