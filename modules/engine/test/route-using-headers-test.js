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

var Engine = require('../lib/engine');
var engine = new Engine();

exports['route using header'] = function (test) {
    var q = "return {} via route '/foo/bar' using method get using headers 'A' = 'B';";
    engine.execute(q, function(emitter) {
        emitter.on('end', function(e, r) {
            test.equal(r.headers.A, 'B');
            test.done();
        })
    });
};

exports['route using headers'] = function (test) {
    var q = "return {} via route '/foo/bar' using method get using headers 'A' = 'B', 'B' = 'C';";
    engine.execute(q, function(emitter) {
        emitter.on('end', function(e, r) {
            test.equal(r.headers.A, 'B');
            test.equal(r.headers.B, 'C');
            test.done();
        })
    });
};

exports['route using headers token name'] = function (test) {
    var q = "name = \"hello\";return {} via route '/foo/bar' using method get using headers '{name}' = 'B', 'B' = 'C';";
    engine.execute(q, function(emitter) {
        emitter.on('end', function (e, r) {
            test.equal(r.headers.hello, 'B');
            test.equal(r.headers.B, 'C');
            test.done();
        })
    });
};

exports['route using headers token value'] = function (test) {
    var q = "name = \"hello\"; value = \"world\";return {} via route '/foo/bar' using method get using headers '{name}' = '{value}', 'B' = 'C';";
    engine.execute(q, function(emitter) {
        emitter.on('end', function (e, r) {
            test.equal(r.headers.hello, 'world');
            test.equal(r.headers.B, 'C');
            test.done();
        })
    });
};
