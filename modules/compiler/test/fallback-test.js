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
        test.equal(statement[0].rhs.object, 1);
        test.ok(statement[0].rhs.fallback);
        test.ok(statement[0].rhs.fallback.object, 2);
        test.ok(statement[0].rhs.fallback.fallback);
        test.equal(statement[0].rhs.fallback.fallback.object, 3);
        test.done();
    },

    'return-select-obj': function(test) {
        var q = "return select * from a || { 'yeah': 'ok' };";
        var statement = compiler.compile(q);
        test.equal(statement[0].rhs.type, 'select');
        test.ok(statement[0].rhs.fallback);
        test.deepEqual(statement[0].rhs.fallback.object, {'yeah': 'ok'});
        test.done();
    },

    'return-select-select': function(test) {
        var q = "return select * from a || select * from b;";
        var statement = compiler.compile(q);
        test.equal(statement[0].rhs.type, 'select');
        test.ok(statement[0].rhs.fallback);
        test.equal(statement[0].rhs.fallback.type, 'select');
        test.equal(statement[0].rhs.fallback.fromClause[0].name, 'b');
        test.done();
    },

    'return-select-select-select': function(test) {
        var q = "return select * from a || select * from b || select * from c;";
        var statement = compiler.compile(q);
        test.equal(statement[0].rhs.type, 'select');
        test.ok(statement[0].rhs.fallback);
        test.equal(statement[0].rhs.fallback.type, 'select');
        test.equal(statement[0].rhs.fallback.fromClause[0].name, 'b');
        test.equal(statement[0].rhs.fallback.fallback.type, 'select');
        test.equal(statement[0].rhs.fallback.fallback.fromClause[0].name, 'c');
        test.done();
    },

    'assign-select-obj': function(test) {
        var q = "a = select * from a || 10.0;";
        var statement = compiler.compile(q);
        test.equal(statement[0].type, 'select');
        test.ok(statement[0].fallback);
        test.equal(statement[0].fallback.object, 10);
        test.done();
    }


};
