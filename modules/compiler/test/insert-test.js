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

var compiler = require('lib/compiler'),
    sys = require('sys');

exports['insert'] = function(test) {
    var q = "insert into suppliers (supplier_id, supplier_name) values ('24553', 'IBM')";
    var statement = compiler.compile(q);
    var e = [{
        "type": "insert",
        "source": {
            "name": "suppliers"
        },
        "columns": [
            {name: "supplier_id"},
            {name: "supplier_name"}
        ],
        "values": [
            "24553",
            "IBM"
        ],
        "line": 1,
        "id": 0
    }];
    test.deepEqual(statement, e);
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
    var e = [
        {
            "type": "insert",
            "source": {
                "name": "foo"
            },
            "columns": [
                {name: "a"},
                {name: "b"},
                {name: "c"}
            ],
            "values": [
                "a",
                "b",
                "c"
            ],
            "line": 1,
            "assign": "a",
            "id": 0,
            dependsOn: [],
            listeners: []
        },
        {
            rhs: {
                "object": {},
                type: 'define',
                line: 2
            },
            "type": "return",
            "line": 2,
            "id": 1,
            dependsOn: [],
            listeners: []
        }
    ];
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
