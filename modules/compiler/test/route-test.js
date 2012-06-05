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

exports['route get'] = function (test) {
    var q = "des = describe foo; return des via route '/foo/bar' using method get;";
    var compiled = compiler.compile(q);
    test.equals(compiled.type, 'return', 'expected return');
    test.equals(compiled.dependsOn[0].type, 'describe', 'expected describe');
    test.ok(compiled.route, 'expected a route');
    test.ok(compiled.route.path.value, '/foo/bar');
    test.ok(compiled.route.method, 'get');
    test.done();
};


exports['route post'] = function (test) {
    var q = "des = describe foo; return des via route '/foo/{id}' using method post;";
    var compiled = compiler.compile(q);
    test.equals(compiled.type, 'return', 'expected return');
    test.equals(compiled.dependsOn[0].type, 'describe', 'expected describe');
    test.ok(compiled.route, 'expected a route');
    test.ok(compiled.route.path.value, '/foo/bar');
    test.ok(compiled.route.method, 'get');
    test.done();
};
