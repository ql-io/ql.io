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
var util = require('util');

module.exports = {
    'update': function (test) {
        var q = 'a = { "one" : 1 }; update tab with "{a}"';
        var statement = compiler.compile(q);
        test.ok(statement.rhs.type === 'update');
        test.ok(statement.rhs.dependsOn.length === 1);
        test.done();
    },

    'update-select': function (test) {
        var q = 'a = select * from tab; update tab with "{a}"';
        var statement = compiler.compile(q);
        test.ok(statement.rhs.type === 'update');
        test.ok(statement.rhs.dependsOn.length === 1);
        test.ok(statement.rhs.dependsOn[0].type === "select");
        test.done();
    }
};