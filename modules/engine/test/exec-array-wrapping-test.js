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

var Engine = require('../lib/engine');

var engine = new Engine(),
    sys = require('sys');

module.exports = {
    'find arr': function(test) {
        var script = 'source = {\
          "field": "f",\
          "arr": [\
            {"a": "1"},\
            {"a": "2"}\
          ]\
        };\
        return "{source.$..a}";';
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, ["1", "2"]);
                test.done();
            }
        });
    },

    'find arr one': function(test) {
        var script = 'source = {\
          "field": "f",\
          "arr": ["1"]\
        };\
        return "{source.arr}";';
        engine.exec(script, function(err, result) {
            if(err) {
                console.log(err.stack || err);
                test.fail('got error: ' + err.message);
                test.done();
            }
            else {
                test.deepEqual(result.body, ['1']);
                test.done();
            }
        });
    },

    'find one': function(test) {
            var script = 'source = {\
              "field": "f",\
              "arr": ["1"]\
            };\
            return "{source.field}";';
            engine.exec(script, function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.fail('got error: ' + err.message);
                    test.done();
                }
                else {
                    test.deepEqual(result.body, 'f');
                    test.done();
                }
            });
        }
};
