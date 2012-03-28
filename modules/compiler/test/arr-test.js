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

exports['simple'] = function(test) {
    var q = 'n = [["Gap","Addidas","Gravati2a"], ["Gap","Addidasf"], ["Gravati","Addis"]];\
            return n;';
    var compiled = compiler.compile(q);
    var e = [ { object:
         [ [ 'Gap', 'Addidas', 'Gravati2a' ],
           [ 'Gap', 'Addidasf' ],
           [ 'Gravati', 'Addis' ] ],
        type: 'define',
        line: 1,
        assign: 'n',
        id: 0,
        dependsOn: [],
        listeners: [] },
      { type: 'return',
        line: 1,
        id: 1,
        rhs: { ref: 'n' },
        dependsOn: [],
        listeners: [] } ]
    test.deepEqual(compiled, e);
    test.done();
};