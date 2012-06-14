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

process.on('uncaughtException', function(error) {
    console.log(error.stack || error);
});
module.exports = {
    'missing-udf': function(test) {
        var script = 'a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                            {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                            {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      return select a1.name, a1.keys from a1 where toUpper()';
        // Must fail since the UDF is not defined
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, results) {
                if(err) {
                    test.ok(true);
                }
                else {
                    test.ok(false);
                }
                test.done();
            })
        });
    },

    'no-args': function(test) {
        var script = 'u = require("./test/udfs/upper.js");\
                      a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                    {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                    {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      return select name, keys from a1 where u.toUpper()';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.equals(results.body[0][0], 'BRAND-A');
                    test.equals(results.body[1][0], 'BRAND-B');
                    test.equals(results.body[2][0], 'BRAND-C');
                }
            });
            test.done();
        });
    },

    'literal-args-str': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                      a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                            {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                            {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      return select name, keys from a1 where u.echo("one", "two")';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    for(var i = 0; i < 3; i++) {
                        test.equals(results.body[i][0], 'one');
                        test.equals(results.body[i][1], 'two');
                    }
                    test.done();
                }
            })
        });
    },

    'literal-args-mixed': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                      a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                            {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                            {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                      return select name, keys from a1 where u.echo("one", 2, 1.2345, false, true, {"name":"value"})';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    for(var i = 0; i < 3; i++) {
                        test.equals(results.body[i][0], 'one');
                        test.equals(results.body[i][1], 2);
                        test.equals(results.body[i][2], 1.2345);
                        test.equals(results.body[i][3], false);
                        test.equals(results.body[i][4], true);
                        test.equals(results.body[i][5].name, "value");
                    }
                    test.done();
                }
            })
        });
    },

    'col-args': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                              a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                    {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                    {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                              return select name, keys from a1 where u.echo(name, keys)';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.equal(results.body[0][0], 'Brand-A');
                    test.deepEqual(results.body[0][1], [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]);
                    test.equal(results.body[1][0], 'Brand-B');
                    test.deepEqual(results.body[1][1], [{ "name": "G1"},{"name": "G2"}]);
                    test.equal(results.body[2][0], 'Brand-C');
                    test.deepEqual(results.body[2][1], [{ "name": "G4"},{"name": "G2"}]);
                    test.done();
                }
            })
        });
    },

    'col-args-extra-echo': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                                  a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                        {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                        {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                                  return select name from a1 where u.echo(name, keys)';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.equal(results.body[0][0], 'Brand-A');
                    test.deepEqual(results.body[0][1], [
                        { "name": "G1"},
                        {"name": "G2"},
                        {"name": "G3"}
                    ]);
                    test.equal(results.body[1][0], 'Brand-B');
                    test.deepEqual(results.body[1][1], [
                        { "name": "G1"},
                        {"name": "G2"}
                    ]);
                    test.equal(results.body[2][0], 'Brand-C');
                    test.deepEqual(results.body[2][1], [
                        { "name": "G4"},
                        {"name": "G2"}
                    ]);
                    for(var i = 0; i < 3; i++) {
                        test.equal(results.body[i].length, 2, 'Expected two fields, but found ' + results.body[i].length);
                    }
                    test.done();
                }
            })
        });
    },

    'col-args-alias-extra-echo': function(test) {
        var script = 'u = require("./test/udfs/args.js");\
                                      a1 = [{"name": "Brand-A", "color": "red", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                            {"name": "Brand-B", "color": "green", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                            {"name": "Brand-C", "color": "blue", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                                      return select name as n, keys as k from a1 where u.echo(name, color, keys)';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    // Though we selected fields by alias the UDF converted into an array,
                    test.equal(results.body[0][0], 'Brand-A');
                    test.equal(results.body[0][1], 'red');
                    test.deepEqual(results.body[0][2], [
                        { "name": "G1"},
                        {"name": "G2"},
                        {"name": "G3"}
                    ]);
                    test.equal(results.body[1][0], 'Brand-B');
                    test.equal(results.body[1][1], 'green');
                    test.deepEqual(results.body[1][2], [
                        { "name": "G1"},
                        {"name": "G2"}
                    ]);
                    test.equal(results.body[2][0], 'Brand-C');
                    test.equal(results.body[2][1], 'blue');
                    test.deepEqual(results.body[2][2], [
                        { "name": "G4"},
                        {"name": "G2"}
                    ]);
                    for(var i = 0; i < 3; i++) {
                        test.equal(results.body[i].length, 3, 'Expected three fields, but found ' + results.body[i].length);
                    }
                    test.done();
                }
            })
        });
    },

    'col-args-extra-thru': function(test) {
        // Selected rows should not have keys
        var script = 'u = require("./test/udfs/args.js");\
                                      a1 = [{"name": "Brand-A", "color": "red", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                            {"name": "Brand-B", "color": "green", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                            {"name": "Brand-C", "color": "blue", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                                      return select name from a1 where u.thru(name, keys, color)';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.equal(results.body[0][0], 'Brand-A');
                    test.equal(results.body[1][0], 'Brand-B');
                    test.equal(results.body[2][0], 'Brand-C');
                    for(var i = 0; i < 3; i++) {
                        test.equal(results.body[i].length, 1, 'Expected one field, but found ' + results.body[i].length);
                    }
                    test.done();
                }
            })
        });
    },

    'col-args-alias-extra-thru': function (test) {
        var script = 'u = require("./test/udfs/args.js");\
                                      a1 = [{"name": "Brand-A", "color": "red", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                                            {"name": "Brand-B", "color": "green", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                                            {"name": "Brand-C", "color": "blue", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
                                      return select name as n, keys as k from a1 where u.thru(name, color,  keys)';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    // Though we selected fields by alias the UDF converted into an array,
                    test.equal(results.body[0].n, 'Brand-A');
                    test.deepEqual(results.body[0].k, [
                        { "name": "G1"},
                        {"name": "G2"},
                        {"name": "G3"}
                    ]);
                    test.equal(results.body[1].n, 'Brand-B');
                    test.deepEqual(results.body[1].k, [
                        { "name": "G1"},
                        {"name": "G2"}
                    ]);
                    test.equal(results.body[2].n, 'Brand-C');
                    test.deepEqual(results.body[2].k, [
                        { "name": "G4"},
                        {"name": "G2"}
                    ]);
                    test.done();
                }
            })
        });
    },

    'filter-row': function(test) {
        var script = 'u = require("./test/udfs/filter.js");\n\
                      a = [1, 1, 2, 2, 3, 3, 4];\n\
                      b = select * from a where u.filter();\n\
                      return b';
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, results) {
                test.deepEqual(results.body, [1,2,3,4]);
                test.done();
            });
        })
    },


    'select-*': function(test) {
        var script = 'u = require("./test/udfs/args.js");\n\
                      a = {"arr": [1, 1, 2, 2, 3, 3, 4]};\n\
                      b = select * from a where u.stringify();\n\
                      return b';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                    test.done();
                }
                else {
                    test.equal(results.body, '{"arr":[1,1,2,2,3,3,4]}');
                    test.done();
                }
            })
        });

    }
}