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

exports['describe'] = function (test) {
    var q = "describe foo";
    var statement = compiler.compile(q);
    var e = {
        type: 'describe',
        line: 1,
        source: {'name': 'foo' },
        dependsOn: [],
        id: 0
    };
    test.deepEqual(statement.rhs, e);
    test.done();
};

exports['desc'] = function (test) {
    var q = "desc foo";
    var statement = compiler.compile(q);
    var e = {
        type: 'describe',
        line: 1,
        source: {'name': 'foo' },
        dependsOn: [],
        id: 0
    };
    test.deepEqual(statement.rhs, e);
    test.done();
};

exports['describe-no-table'] = function(test) {
    var q = "describe ";
    try {
        compiler.compile(q);
        test.fail('table name is missing');
        test.done();
    }
    catch(e) {
        test.ok(true);
        test.done();
    }
};

// In this test, describe won't get executed
exports['describe-assign'] = function (test) {
    var q = "des = describe foo; return {};";
    var statement = compiler.compile(q);
    var e = { type: 'return',
      line: 1,
      id: 1,
      rhs: { object: {}, type: 'define', line: 1 },
      dependsOn: [] };
    test.deepEqual(statement, e);
    test.done();
};


