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

exports['show'] = function (test) {
    var q = "show tables";
    var statement = compiler.compile(q);
    var e = [{
        type: 'show',
        line: 1,
        id: 0
    }];
    test.deepEqual(statement, e);
    test.done();
};


exports['show assign'] = function (test) {
    var q = "tables = show tables; return {};";
    var statement = compiler.compile(q);
    var e = [
        {
            type: 'show',
            line: 1,
            assign: 'tables',
            id: 0,
            dependsOn: [],
            listeners: []
        },
        {
            rhs: {
                object: {},
                type: 'define',
                line: 1
            },
            line: 1,
            type: "return",
            id: 1,
            dependsOn: [],
            listeners: []
        }
    ];
    test.deepEqual(statement, e);
    test.done();
};
