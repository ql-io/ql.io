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

exports['insert'] = function(test) {
    var q = "insert into suppliers (supplier_id, supplier_name) values ('24553', 'IBM')";
    var statement = compiler.compile(q);
    var e = {
        "type": "insert",
        "source": {
            "name": "suppliers"
        },
        "columns": [
            {name: "supplier_id",type: 'column'},
            {name: "supplier_name",type: 'column'}
        ],
        "values": [
            "24553",
            "IBM"
        ],
        "line": 1,
        "id": 0
    };
    test.deepEqual(statement.rhs, e);
    test.done();
};

exports['mismatch-count'] = function(test) {
    var q = "insert into ebay.internal.shorturi (longUri, duration) values ('http://desc.shop.ebay.in/helloworld', '1', '2')";
    var statement;
    try {
        statement = compiler.compile(q);
        test.ok(false, 'Did not fail.');
        test.done();
    }
    catch(e) {
        test.ok(true);
        test.done();
    }
}

exports['insert-assign'] = function(test) {
    var q = "a = insert into foo (a, b, c) values ('a', 'b', 'c'); \nreturn {};";
    var statement = compiler.compile(q);
    var e = {
            rhs: {
                "object": {},
                type: 'define',
                line: 2
            },
            "type": "return",
            "line": 2,
            "id": 1,
            dependsOn: []
        };
    test.deepEqual(statement, e);
    test.done();
};

exports['insert-no-table'] = function(test) {
    var q = "insert into";
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

exports['insert-opaque'] = function(test) {
    var q = "insert into suppliers values ('24553')"
    var statement = compiler.compile(q);
    var e = {
            "type": "insert",
            "source": {
                "name": "suppliers"
            },
            "values": "24553",
            "line": 1,
            "id": 0
        };
    test.deepEqual(statement.rhs, e);
    test.done();
};

exports['insert-multiparts'] = function(test) {
    var q = 'insert into mytable (name, salary) values ( "John Smith", 5) with parts "{parts[0]}", "{parts[4]}", "{parts[2]}"';
    var statement = compiler.compile(q);
    var e = {
            "type": "insert",
            "source": {
                "name": "mytable"
            },
            "values": [
                "John Smith",
                5
            ],
            "line": 1,
            "columns": [
                {
                    "type": "column",
                    "name": "name"
                },
                {
                    "type": "column",
                    "name": "salary"
                }
            ],
            "parts": [
                "{parts[0]}",
                "{parts[4]}",
                "{parts[2]}"
            ],
            "id": 0
        };
    test.deepEqual(statement.rhs, e);
    test.done();
};

exports['insert-timeout'] = function(test) {
    var q = "insert into suppliers (supplier_id, supplier_name) values ('24553', 'IBM') timeout 10 minDelay 100 maxDelay 10000";
    var statement = compiler.compile(q);
    var e = {
        "type": "insert",
        "source": {
            "name": "suppliers"
        },
        "columns": [
            {name: "supplier_id",type: 'column'},
            {name: "supplier_name",type: 'column'}
        ],
        "values": [
            "24553",
            "IBM"
        ],
        timeout: 10,
        minDelay: 100,
        maxDelay: 10000,
        "line": 1,
        "id": 0
    };
    test.deepEqual(statement.rhs, e);
    test.done();
};


exports['insert-obj'] = function(test) {
    var q = 'obj = {\n\
                "p3" : "v3",\n\
                "p4" : "v4"\n\
             };\n\
             updated = insert into obj (p5, p6) values ("v5", "v6");\n\
             return updated;'

    var plan = compiler.compile(q);
    test.equals(plan.dependsOn[0].assign, 'updated');
    test.equals(plan.dependsOn[0].listeners[0].type, 'return');
    test.equals(plan.dependsOn[0].type, 'insert');
    test.deepEqual(plan.dependsOn[0].columns, [ { type: 'column', name: 'p5' },
                  { type: 'column', name: 'p6' } ]);
    test.deepEqual(plan.dependsOn[0].values, ['v5', 'v6']);
    test.equals(plan.dependsOn[0].dependsOn[0].assign, 'obj');
    test.equals(plan.dependsOn[0].dependsOn[0].listeners[0].assign, 'updated');
    test.done();
}