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

var compiler = require('../lib/compiler');

module.exports = {
    'return-values': function(test) {
        var q = "return 1 || 2 || 3";
        var statement = compiler.compile(q);
        test.equal(statement.rhs.object, 1);
        test.ok(statement.rhs.fallback);
        test.ok(statement.rhs.fallback.object, 2);
        test.ok(statement.rhs.fallback.fallback);
        test.equal(statement.rhs.fallback.fallback.object, 3);
        test.done();
    },

    'return-select-obj': function(test) {
        var q = "return select * from a || { 'yeah': 'ok' };";
        var statement = compiler.compile(q);
        test.equal(statement.rhs.type, 'select');
        test.ok(statement.rhs.fallback);
        test.deepEqual(statement.rhs.fallback.object, {'yeah': 'ok'});
        test.done();
    },

    'return-select-select': function(test) {
        var q = "return select * from a || select * from b;";
        var statement = compiler.compile(q);
        test.equal(statement.rhs.type, 'select');
        test.ok(statement.rhs.fallback);
        test.equal(statement.rhs.fallback.type, 'select');
        test.equal(statement.rhs.fallback.fromClause[0].name, 'b');
        test.done();
    },

    'return-select-select-select': function(test) {
        var q = "return select * from a || select * from b || select * from c;";
        var statement = compiler.compile(q);
        test.equal(statement.rhs.type, 'select');
        test.ok(statement.rhs.fallback);
        test.equal(statement.rhs.fallback.type, 'select');
        test.equal(statement.rhs.fallback.fromClause[0].name, 'b');
        test.equal(statement.rhs.fallback.fallback.type, 'select');
        test.equal(statement.rhs.fallback.fallback.fromClause[0].name, 'c');
        test.done();
    },

    'assign-select-obj': function(test) {
        var q = "a = select * from A || 10.0;";
        var statement = compiler.compile(q);
        test.equal(statement.rhs.type, 'select');
        test.ok(statement.rhs.fallback);
        test.equal(statement.rhs.fallback.object, 10);
        test.equal(statement.rhs.fallback.assign, statement.rhs.assign);
        test.done();
    },

    'deps-statements': function(test) {
        var q = "a = select * from A;\n\
                 b = select * from B;\n\
                 foo = select * from a || select * from b;\n\
                 return foo;";
        var statement = compiler.compile(q);
        test.equal(statement.rhs.ref, 'foo')
        test.equal(statement.dependsOn.length, 1)
        test.equal(statement.dependsOn[0].type, 'select');
        test.equal(statement.dependsOn[0].fromClause[0].name, '{a}');
        test.equal(statement.dependsOn[0].dependsOn.length, 1);
        test.equal(statement.dependsOn[0].dependsOn[0].fromClause[0].name, 'A');
        test.equal(statement.dependsOn[0].fallback.type, 'select');
        test.equal(statement.dependsOn[0].fallback.fromClause[0].name, '{b}');
        test.equal(statement.dependsOn[0].fallback.dependsOn.length, 1);
        test.equal(statement.dependsOn[0].fallback.dependsOn[0].fromClause[0].name, 'B');
        test.equal(statement.rhs.ref, statement.dependsOn[0].fallback.assign)
        test.done();
    },

    'assign-chaining': function(test) {
        var q = "a = 10 || 20 || 30 || 40";
        var statement = compiler.compile(q);
        test.equal(statement.rhs.assign, 'a');
        test.equal(statement.rhs.fallback.assign, 'a');
        test.equal(statement.rhs.fallback.fallback.assign, 'a');
        test.equal(statement.rhs.fallback.fallback.fallback.assign, 'a');
        test.done();
    },

    'dep-orhpahs': function(test) {
        var q = "data = [\
                        {'name' : 'foo'},\
                        {'name' : 'bar'},\
                        {'name' : 'baz'}];\
                     a = select name from data;\n\
                     b = select * from t1 where name in '{data.name}' || '{a}';\n\
                     return select * from t2 || a";
        var plan = compiler.compile(q);
        test.equals(plan.rhs.type, 'select');
        test.equals(plan.rhs.fallback.type, 'ref');
        test.equals(plan.rhs.fallback.ref, 'a');
        test.equals(plan.rhs.fallback.dependsOn.length, 1);
        test.equals(plan.rhs.fallback.dependsOn[0].type, 'select');
        test.equals(plan.rhs.fallback.dependsOn[0].assign, 'a');
        test.equals(plan.rhs.fallback.dependsOn[0].dependsOn.length, 1);
        test.equals(plan.rhs.fallback.dependsOn[0].dependsOn[0].type, 'define');
        test.equals(plan.rhs.fallback.dependsOn[0].dependsOn[0].assign, 'data');
        test.equals(plan.dependsOn.length, 1);
        test.equals(plan.dependsOn[0].type, 'select');
        test.equals(plan.dependsOn[0].assign, 'b');
        test.equals(plan.rhs.fallback.dependsOn.length, 1);
        test.equals(plan.rhs.fallback.dependsOn[0].type, 'select');
        test.equals(plan.rhs.fallback.dependsOn[0].assign, 'a');

        test.done();
    },

    'fallback-ref': function(test) {
        var q = "a = {'message': 'fallback'}; return select * from foo || a";
        var plan = compiler.compile(q);
        test.equal(plan.dependsOn.length, 0);
        test.equal(plan.rhs.fallback.dependsOn.length, 1);
        test.equal(plan.rhs.fallback.dependsOn[0].type, 'define');
        test.equal(plan.rhs.fallback.dependsOn[0].assign, 'a');
        test.done();
    }
};
