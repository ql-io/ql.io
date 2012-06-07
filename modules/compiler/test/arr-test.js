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
    var q = '-- Define an object\n\
            n = [["Gap","Addidas","Gravati2a"], ["Gap","Addidasf"], ["Gravati","Addis"]];\
            -- Return now\n\
            return n;';
    var compiled = compiler.compile(q);
    test.equals(compiled.type, 'return');
    test.equals(compiled.comments[0].text, 'Return now');
    test.equals(compiled.rhs.ref, 'n');
    test.deepEqual(compiled.rhs.dependsOn[0].object,
        [['Gap', 'Addidas', 'Gravati2a'], ['Gap', 'Addidasf'], ['Gravati', 'Addis']]);
    test.equals(compiled.rhs.dependsOn[0].type, 'define');
    test.equals(compiled.rhs.dependsOn[0].assign, 'n');
    test.done();
};