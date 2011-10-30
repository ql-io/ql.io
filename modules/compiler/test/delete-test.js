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

var compiler = require('lib/compiler');

exports['delete'] = function (test) {
    var q = "delete from foo where bar = 'a'";
    var statement = compiler.compile(q);
    var e = [{
        "type": "delete",
        "source": {
            "name": "foo"
        },
        "whereCriteria": {
            "operator": "=",
            "lhs": {name: "bar"},
            "rhs": {
                "value": "a"
            }
        },
        "line": 1,
        "id": 0
    }];
    test.deepEqual(statement, e);
    test.done();
};

exports['delete-csv'] = function (test) {
    var q = "delete from ebay.item where itemId in ('180652013910','120711247507')";
    var statement = compiler.compile(q);
    var e = [{
        type: 'delete',
        "source" :
            {name: 'ebay.item'},
        whereCriteria: {
            operator: 'in',
            lhs: {name: 'itemId'},
            "rhs":{
                value: ['180652013910', '120711247507']
            }
        },
        line: 1,
        id: 0
    }];
    var sys = require('sys');
    test.deepEqual(statement, e);
    test.done();
};
