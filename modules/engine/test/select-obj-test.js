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
    'select-star-from-obj': function(test) {
        var context, q;
        context = {
            foo : {
                'hello' : 'Hello',
                'world' : 'World'
            }
        };
        q = 'select * from foo';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, context.foo);
                test.done();
            }
        }});
    },

    'select-some-from-obj': function(test) {
        var context, q;
        context = {
            foo : {
                'fname' : 'Hello',
                'lname' : 'World',
                'place' : 'Sammamish, WA'
            }
        };
        q = 'select fname, lname, place from foo';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equals(result.body.length, 1);
                test.equals(result.body[0][0], 'Hello');
                test.equals(result.body[0][1], 'World');
                test.equals(result.body[0][2], 'Sammamish, WA');
                test.done();
            }
        }});
    },

    'select-deeper' : function(test) {
        var context, q;
        context = {
            foo : {
                'name' : {
                    'first' : 'Hello',
                    'last' : 'World'
                },
                'addresses' : [
                    {
                        'street' : '1 Main Street',
                        'city' : 'No Name'
                    },
                    {
                        'street' : '2 Main Street',
                        'city' : 'Some Name'
                    }]
            }
        };
        q = 'select addresses[0].street, addresses[1].city, name.last from foo';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equals(result.body.length, 1);
                test.equals(result.body[0][0], '1 Main Street');
                test.equals(result.body[0][1], 'Some Name');
                test.equals(result.body[0][2], 'World');
                test.done();
            }
        }});
    },

    'select-filter-integer' : function(test) {
        var context, q;
        context = {
            foo: [
                { "id": 1, "foo": true },
                { "id": 2, "foo": false }
            ]
        };
        q = 'select * from foo where id = 1';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, [ { "id": 1, "foo": true } ]);
                test.done();
            }
        }});
    },

    'select-filter-string' : function(test) {
        var context, q;
        context = {
            foo: [
                { "name": "name-A", "foo": true },
                { "name": "name-B", "foo": false }
            ]
        };
        q = 'select * from foo where name = "name-A"';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, [ { "name": "name-A", "foo": true } ]);
                test.done();
            }
        }});
    },

    'select-filter-true' : function(test) {
        var context, q;
        context = {
            foo: [
                { "id": 1, "foo": true },
                { "id": 2, "foo": false }
            ]
        };
        q = 'select * from foo where foo = true';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, [ { "id": 1, "foo": true } ]);
                test.done();
            }
        }});
    },

    'select-filter-true-only' : function(test) {
        var context, q;
        context = {
            foo: [
                { "id": 1, "foo": true },
                { "id": 2, "foo": 1 } // 1 is not true
            ]
        };
        q = 'select * from foo where foo = true';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, [ { "id": 1, "foo": true } ]);
                test.done();
            }
        }});
    },

    'select-filter-false-only' : function(test) {
        var context, q;
        context = {
            foo: [
                { "id": 1, "foo": 0 }, // 0 is not false
                { "id": 2, "foo": false }
            ]
        };
        q = 'select * from foo where foo = false';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, [ { "id": 2, "foo": false } ]);
                test.done();
            }
        }});
    },

    'select-join-one-field': function(test) {
        var q = 'a1 = [{ \
            "name": "Name-A",\
            "ns": "n1"\
          },\
          {\
            "name": "Name-B",\
            "ns": "n2" \
          },\
          {\
            "name": "Name-C",\
            "ns": "n3"\
          }];\
        a2 = [{\
            "name": "Name-A",\
            "ns": "n1"\
          },\
          {\
            "name": "Name-C",\
            "ns": "n2"\
          }];\
        return select a1.name from a1 as a1, a2 as a2 where a1.name = a2.name;';

        engine.execute(q, function(emitter) {
            emitter.on('end', function(err, results) {
                test.deepEqual(results.body, [ [ 'Name-A' ], [ 'Name-C' ] ]);
                test.done();
            })
        });
    },

    'select-indexed-ref': function (test) {
        var q = "a = {\
                  'b-1' : 'B1',\
                  'b-2' : 'B2',\
                  'b-3' : {\
                      'c-1' : 'C1'\
                  }\
                };\
                return select 'b-1', 'b-3'['c-1'] from a;"
        engine.execute(q, function(emitter) {
            emitter.on('end', function(err, results) {
                test.deepEqual(results.body, [["B1","C1"]]);
                test.done();
            })
        })
    }
};
