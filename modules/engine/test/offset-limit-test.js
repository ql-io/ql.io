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

var _ = require('underscore'),
    util = require('util'),
    Engine = require('../lib/engine');

var engine = new Engine();

module.exports = {
    'limit-1': function (test) {
        var script = 'foo = {"count":3,"input":"abc","groups":[],"items":[{"w":"ab","f":"ab","l":\
                            1},{"w":"ba","f":"ba","l":2},{"w":"cab","f":"cab","l":3}]};\
                      bar = "{foo.items}";\
                      return select w as w, f as f, l as l from bar limit 1';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(true);
                    test.done();
                }
                else {
                    test.equal(results.body.length, 1);
                    test.deepEqual(results.body[0], {
                        "w": "ab",
                        "f": "ab",
                        "l": 1
                    });
                    test.done();
                }
            })
        });
    },

    'limit-2': function (test) {
        var script = 'foo = {"count":3,"input":"abc","groups":[],"items":[{"w":"ab","f":"ab","l":\
                                1},{"w":"ba","f":"ba","l":2},{"w":"cab","f":"cab","l":3}]};\
                          bar = "{foo.items}";\
                          return select w as w, f as f, l as l from bar limit 2';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(true);
                    test.done();
                }
                else {
                    test.equal(results.body.length, 2);
                    test.deepEqual(results.body[0], {
                        "w": "ab",
                        "f": "ab",
                        "l": 1
                    });
                    test.deepEqual(results.body[1], {
                        "w": "ba",
                        "f": "ba",
                        "l": 2
                    });
                    test.done();
                }
            })
        });
    },

    'limit-2-offset-1': function (test) {
        var script = 'foo = {"count":3,"input":"abc","groups":[],"items":[{"w":"ab","f":"ab","l":\
                                    1},{"w":"ba","f":"ba","l":2},{"w":"cab","f":"cab","l":3}]};\
                              bar = "{foo.items}";\
                              return select w as w, f as f, l as l from bar limit 2 offset 1 ';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(true);
                    test.done();
                }
                else {
                    test.equal(results.body.length, 2);
                    test.deepEqual(results.body[0], {
                        "w": "ba",
                        "f": "ba",
                        "l": 2
                    });
                    test.deepEqual(results.body[1], {
                        "w": "cab",
                        "f": "cab",
                        "l": 3
                    });
                    test.done();
                }
            })
        });
    },

}
