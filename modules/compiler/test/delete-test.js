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

exports['delete'] = function (test) {
    var q = "delete from foo where bar = 'a'";
    var plan = compiler.compile(q);
    test.equals(plan.rhs.type, 'delete');
    test.equals(plan.rhs.source.name, 'foo');
    test.deepEqual(plan.rhs.whereCriteria, [
        {
            "operator": "=",
            "lhs": {name: "bar", type: 'column'},
            "rhs": {
                "value": "a"
            }
        }
    ]);
    test.done();
};

exports['delete-csv'] = function (test) {
    var q = "delete from ebay.item where itemId in ('180652013910','120711247507')";
    var plan = compiler.compile(q);
    test.equals(plan.rhs.type, 'delete');
    test.equals(plan.rhs.source.name, 'ebay.item');
    test.deepEqual(plan.rhs.whereCriteria, [
        {
            operator: 'in',
            lhs: {name: 'itemId'},
            "rhs": {
                value: ['180652013910', '120711247507']
            }
        }
    ]);
    test.done();
};

exports['delete-timeouts'] = function (test) {
    var q = "delete from ebay.item where itemId in ('180652013910','120711247507') timeout 10 minDelay 100 maxDelay 10000";
    var plan = compiler.compile(q);
    test.equals(plan.rhs.type, 'delete');
    test.equals(plan.rhs.source.name, 'ebay.item');
    test.deepEqual(plan.rhs.whereCriteria, [
        {
            operator: 'in',
            lhs: {name: 'itemId'},
            "rhs": {
                value: ['180652013910', '120711247507']
            }
        }
    ]);
    test.equal(plan.rhs.timeout, 10);
    test.equal(plan.rhs.minDelay, 100);
    test.equal(plan.rhs.maxDelay, 10000);
    test.done();
};

exports['delete-from-obj'] = function (test) {
    var q = 'obj = {\
                "a" : "A",\
                "b" : "B",\
                "c" : "C"\
            }\
            return delete from obj where a = "A";';
    var plan = compiler.compile(q);
    test.deepEqual(plan.rhs.source, {name: '{obj}'});
    test.deepEqual(plan.rhs.whereCriteria,
        [
            { operator: '=',
                lhs: { type: 'column', name: 'a' },
                rhs: { value: 'A' } }
        ]);
    test.deepEqual(plan.rhs.dependsOn[0].object, { a: 'A', b: 'B', c: 'C' });
    test.done();
}


