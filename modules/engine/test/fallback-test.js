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
    'fallback-number': function(test) {
        var q = "return select * from foo || 10 ";
        engine.execute(q, function(emitter) {
            emitter.on('end', function(err, results) {
                test.equals(results.body, 10);
                test.done();
            });
        });
    },

    'fallback-obj': function(test) {
        var q = "return select * from foo || {'message': 'fallback'}";
        engine.execute(q, function(emitter) {
            emitter.on('end', function (err, results) {
                test.equals(results.body.message, 'fallback');
                test.done();
            });
        });
    },

    'fallback-ref': function (test) {
        var q = "a = {'message': 'fallback'}; return select * from foo || a";
        engine.execute(q, function (emitter) {
            emitter.on('end', function (err, results) {
                test.equals(results.body.message, 'fallback');
                test.done();
            });
        });
    },

    'select-fallback-main-dep': function (test) {
        // If foo's fallback depends on both a and b, what happens when a is completed?
        var q = "data = [\
                        {'name' : 'foo'},\
                        {'name' : 'bar'},\
                        {'name' : 'baz'}];\
                     a = select name from data;\n\
                     b = select * from t1 where name in '{data.name}' || '{a}';\n\
                     return select * from t2 || a";
        engine.execute(q, function (emitter) {
            var counter = 0;
            emitter.on('a', function () {
                counter++;
            });
            emitter.on('end', function (err, results) {
                test.equal(counter, 1);
                test.deepEqual(results.body, ['foo', 'bar', 'baz'])
                test.done();
            })
        })
    }
};