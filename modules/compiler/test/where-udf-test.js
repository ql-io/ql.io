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

"use strict";

var compiler = require('../lib/compiler');

module.exports = {
    'udf-with-join': function(test) {
        var q = 'select a2.name from a1 as a1, a2 as a2 where a1.name = a2.name and f1(a1.keys..name)';
        var c = compiler.compile(q);
        test.deepEqual(c[0].columns[0], {name: 'a1.name', type: 'column'});
        test.deepEqual(c[0].whereCriteria[0], {
                    "operator": "udf",
                    "name": "f1",
                    "args": [{"type": "column", "name": "a1.keys..name"}]
                 });
        test.done();
    }
};
