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
    'udf-args': function(test) {
        var q = 'select id, name(fname, lname) from people';
        var c = compiler.compile(q);
        var columns = [
            { type: 'column', name: 'id' },
            { operator: 'udf',
                name: 'name',
                args: [
                    { type: 'column', name: 'fname' },
                    { type: 'column', name: 'lname' }
                ] }
        ];
        test.deepEqual(c.rhs.columns, columns);
        test.done();
    },

    'udf-args-literal': function(test) {
        var q = 'select id, name(1, 2.0, "hello", "hello world", {"p" : "v"}) from people';
        var c = compiler.compile(q);
        test.deepEqual(c.rhs.columns[1].args, [
            {
                "type": "literal",
                "value": 1
            },
            {
                "type": "literal",
                "value": 2.0
            },
            {
                "type": "literal",
                "value": "hello"
            },
            {
                "type": "literal",
                "value": "hello world"
            },
            {
                "type": "literal",
                "value": {'p' : 'v'}
            }
        ]);
        test.done();
    },

    'udf-args-mixed': function(test) {
        var q = 'select id, name(1, fname, lname) from people;';
        var c = compiler.compile(q);
        test.deepEqual(c.rhs.columns[1].args, [
                       {
                          "type": "literal",
                          "value": 1
                       },
                       {
                          "type": "column",
                          "name": "fname"
                       },
                       {
                          "type": "column",
                          "name": "lname"
                       }
                    ])
        test.done();
    },

    'udf-args-with-alias': function(test) {
        var q = 'select id as id, name(fname, lname) as name from people';
        var c = compiler.compile(q);
        var columns = [ { type: 'column', name: 'id', alias: 'id' },
          { operator: 'udf',
            name: 'name',
            args:
             [ { type: 'column', name: 'fname' },
               { type: 'column', name: 'lname' } ],
            alias: 'name' } ];
        test.deepEqual(c.rhs.columns, columns);
        test.done();
    }
};
