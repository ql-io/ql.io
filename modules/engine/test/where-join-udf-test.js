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
    'join-base-line': function(test) {
        var script = 'u = require("./test/udfs/upper.js");\
                      a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                            {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                            {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},\
                            {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];\
                      return select a2.details from a1 as a1, a2 as a2 where a1.name = a2.name ';
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.deepEqual(results.body[0][0], [{ name: 'G3', count: 32 }, { name: 'G5', count: 18 }]);
                    test.deepEqual(results.body[1][0], [{ name: 'G3', count: 32 }, { name: 'G5', count: 18 }]);
                    test.done();
                }
            })
        });
    },

    'join-cols-as-args': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                      a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                            {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                            {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},\
                            {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];\
                      return select a2.details from a1 as a1, a2 as a2 where a1.name = a2.name and u.append(a1.name, a2.name)';
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    for(var i = 0; i < 2; i++) {
                        test.equal(results.body[i].length, 3);
                    }
                    test.deepEqual(results.body[0][0], [{ name: 'G3', count: 32 }, { name: 'G5', count: 18 }]);
                    test.deepEqual(results.body[0][1], 'Brand-A');
                    test.deepEqual(results.body[0][2], 'Brand-A');
                    test.deepEqual(results.body[1][0], [{ name: 'G3', count: 32 }, { name: 'G5', count: 18 }]);
                    test.deepEqual(results.body[1][1], 'Brand-C');
                    test.deepEqual(results.body[1][2], 'Brand-C');
                    test.done();
                }
            })
        });
    },

    'join-cols-as-args-with-aliases': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                          a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                          a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},\
                                {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];\
                          return select a2.details as details from a1 as a1, a2 as a2 where a1.name = a2.name and u.appendFields(a1.name, a2.name)';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.deepEqual(results.body[0].details, [
                        { name: 'G3', count: 32 },
                        { name: 'G5', count: 18 }
                    ]);
                    test.deepEqual(results.body[0].arg0, 'Brand-A');
                    test.deepEqual(results.body[0].arg1, 'Brand-A');
                    test.deepEqual(results.body[1].details, [
                        { name: 'G3', count: 32 },
                        { name: 'G5', count: 18 }
                    ]);
                    test.deepEqual(results.body[1].arg0, 'Brand-C');
                    test.deepEqual(results.body[1].arg1, 'Brand-C');
                    test.done();
                }
            })
        });
    },

    'join-cols-as-args-plus-one': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                      a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                            {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                            {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},\
                            {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];\
                      return select a2.details from a1 as a1, a2 as a2 where a1.name = a2.name and u.append(a1.name, a2.name, a1.keys)';
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    for(var i = 0; i < 2; i++) {
                        test.equal(results.body[i].length, 4);
                    }
                    test.deepEqual(results.body[0][0], [{ name: 'G3', count: 32 }, { name: 'G5', count: 18 }]);
                    test.deepEqual(results.body[0][1], 'Brand-A');
                    test.deepEqual(results.body[0][2], 'Brand-A');
                    test.deepEqual(results.body[0][3], [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]);
                    test.deepEqual(results.body[1][0], [{ name: 'G3', count: 32 }, { name: 'G5', count: 18 }]);
                    test.deepEqual(results.body[1][1], 'Brand-C');
                    test.deepEqual(results.body[1][2], 'Brand-C');
                    test.deepEqual(results.body[1][3], [{ "name": "G4"},{"name": "G2"}]);
                    test.done();
                }
            })
        });
    },

    'join-cols-as-args-plus-one-with-alias': function (test) {
        var script = 'u = require("./test/udfs/args.js");\
                          a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                          a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},\
                                {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];\
                          return select a2.details as details from a1 as a1, a2 as a2 where a1.name = a2.name and u.appendFields(a1.name, a2.name, a1.keys)';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.deepEqual(results.body[0].details, [
                        { name: 'G3', count: 32 },
                        { name: 'G5', count: 18 }
                    ]);
                    test.deepEqual(results.body[0].arg0, 'Brand-A');
                    test.deepEqual(results.body[0].arg1, 'Brand-A');
                    test.deepEqual(results.body[0].arg2, [
                        { "name": "G1"},
                        {"name": "G2"},
                        {"name": "G3"}
                    ]);
                    test.deepEqual(results.body[1].details, [
                        { name: 'G3', count: 32 },
                        { name: 'G5', count: 18 }
                    ]);
                    test.deepEqual(results.body[1].arg0, 'Brand-C');
                    test.deepEqual(results.body[1].arg1, 'Brand-C');
                    test.deepEqual(results.body[1].arg2, [
                        { "name": "G4"},
                        {"name": "G2"}
                    ]);
                    test.done();
                }
            })
        });
    },

    'join-cols-filter-row': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                      a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                            {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                            {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18},{"name": "G1","count": 40}]},\
                            {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];\
                      return select a2.name, a2.details from a1 as a1, a2 as a2 where a1.name = a2.name and u.filterRow(a1.keys)';
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.equal(results.body.length, 1);
                    test.deepEqual(results.body[0][1], [ { name: 'G3', count: 32 }, { name: 'G1', count: 40 } ]);
                    test.done();
                }
            })
        });
    },


    'udf-this': function(test) {
        var script = 'u = require("./test/udfs/this.js");\
                      a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                            {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                            {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18},{"name": "G1","count": 40}]},\
                            {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];\
                      return select a2.name, a2.details from a1 as a1, a2 as a2 where a1.name = a2.name and u.checkThis()';
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.equal(results.body.length, 2);
                    for(var i = 0; i < 2; i++) {
                        test.ok(results.body[i].a1);
                        test.ok(results.body[i].a2);
                        test.ok(results.body[i].u);
                        test.ok(results.body[i].next);
                        test.ok(results.body[i].row);
                    }
                    test.done();
                }
            })
        });
    }
}