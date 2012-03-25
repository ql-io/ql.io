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

'use strict';

var compiler = require('../lib/compiler');

exports['route using header'] = function (test) {
    var q = "return {} via route '/foo/bar' using method get using headers 'A' = 'B';";
    var compiled = compiler.compile(q);
    test.equals(compiled.length, 1, 'expected one statement');
    test.equals(compiled[0].type, 'return', 'expected return');
    test.ok(compiled[0].route, 'expected a route');
    test.ok(compiled[0].route.path.value, '/foo/bar');
    test.ok(compiled[0].route.method, 'get');
    test.deepEqual(compiled[0].route.headers, {'A' : 'B'});
    test.done();
};

exports['route using headers'] = function (test) {
    var q = "return {} via route '/foo/bar' using method get using headers 'A' = 'B', 'B' = 'C';";
    var compiled = compiler.compile(q);
    test.equals(compiled.length, 1, 'expected one statement');
    test.equals(compiled[0].type, 'return', 'expected return');
    test.ok(compiled[0].route, 'expected a route');
    test.ok(compiled[0].route.path.value, '/foo/bar');
    test.ok(compiled[0].route.method, 'get');
    test.deepEqual(compiled[0].route.headers, {'A' : 'B', 'B' : 'C'});
    test.done();
};

exports['route using headers token name'] = function (test) {
    var q = "name = \"hello\";return {} via route '/foo/bar' using method get using headers '{name}' = 'B', 'B' = 'C';";
    var compiled = compiler.compile(q);
    test.equals(compiled.length, 2, 'expected two statements');
    test.equals(compiled[1].type, 'return', 'expected return');
    test.ok(compiled[1].route, 'expected a route');
    test.ok(compiled[1].route.path.value, '/foo/bar');
    test.ok(compiled[1].route.method, 'get');
    test.deepEqual(compiled[1].route.headers, {'{name}' : 'B', 'B' : 'C'});
    test.done();
};

exports['route using headers token value'] = function (test) {
    var q = "name = \"hello\"; value = \"world\";return {} via route '/foo/bar' using method get using headers '{name}' = '{value}', 'B' = 'C';";
    var compiled = compiler.compile(q);
    test.equals(compiled.length, 3, 'expected two statements');
    test.equals(compiled[2].type, 'return', 'expected return');
    test.ok(compiled[2].route, 'expected a route');
    test.ok(compiled[2].route.path.value, '/foo/bar');
    test.ok(compiled[2].route.method, 'get');
    test.deepEqual(compiled[2].route.headers, {'{name}' : '{value}', 'B' : 'C'});
    test.done();
};
