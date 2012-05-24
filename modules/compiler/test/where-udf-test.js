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
    'star-udf-no-args': function(test) {
        var q = 'select * from a1 where f1()';
        var c = compiler.compile(q);
        test.equal(c.rhs.columns.name, '*');
        test.equal(c.rhs.columns.type, 'column');
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'f1');
        test.equal(c.rhs.whereCriteria[0].args.length, 0);
        test.done();
    },

    'star-star-column-args': function(test) {
        var q = 'select * from a1 where f1(name)';
        var c = compiler.compile(q);
        test.equal(c.rhs.columns.name, '*');
        test.equal(c.rhs.columns.type, 'column');
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'f1');
        test.equal(c.rhs.whereCriteria[0].args.length, 1);
        test.done();
    },

    'star-literal-args': function(test) {
        var q = 'select * from a1 where f1("name", "value")';
        var c = compiler.compile(q);
        test.equal(c.rhs.columns.name, '*');
        test.equal(c.rhs.columns.type, 'column');
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'f1');
        test.equal(c.rhs.whereCriteria[0].args.length, 2);
        test.equal(c.rhs.whereCriteria[0].args[0].value, 'name');
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'literal');
        test.equal(c.rhs.whereCriteria[0].args[1].value, 'value');
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'literal');
        test.done();
    },

    'literal-args': function(test) {
        var q = 'select name, keys from a1 where u.literalArgs("one", 2, 1.2345, false, true, {"name":"value"})';
        var c = compiler.compile(q);
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'u.literalArgs');
        test.equal(c.rhs.whereCriteria[0].args.length, 6);
        for(var i = 0; i < 6; i++) {
            test.equal(c.rhs.whereCriteria[0].args[i].type, 'literal', 'literal expected for arg ' + i);
        }
        test.equal(c.rhs.whereCriteria[0].args[0].value, 'one');
        test.equal(c.rhs.whereCriteria[0].args[1].value, 2);
        test.equal(c.rhs.whereCriteria[0].args[2].value, 1.2345);
        test.equal(c.rhs.whereCriteria[0].args[3].value, false);
        test.equal(c.rhs.whereCriteria[0].args[4].value, true);
        test.equal(c.rhs.whereCriteria[0].args[5].value.name, 'value');
        test.done();
    },

    'column-has-column-args': function(test) {
        var q = 'select name, value from a1 where f1(name)';
        var c = compiler.compile(q);
        test.deepEqual(c.rhs.columns[0].name, 'name');
        test.deepEqual(c.rhs.columns[0].type, 'column');
        test.deepEqual(c.rhs.columns[1].name, 'value');
        test.deepEqual(c.rhs.columns[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'f1');
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[0].name, 'name');
        test.done();
    },

    'column-has-some-columns-args': function(test) {
        var q = 'select name, value from a where f1(name, value, zip)';
        var c = compiler.compile(q);
        test.equal(c.rhs.columns.length, 3);
        test.equal(c.rhs.columns[0].name, 'name');
        test.equal(c.rhs.columns[0].type, 'column');
        test.equal(c.rhs.columns[1].name, 'value');
        test.equal(c.rhs.columns[1].type, 'column');
        test.equal(c.rhs.columns[2].name, 'zip');
        test.equal(c.rhs.columns[2].type, 'column');
        test.equal(c.rhs.extras.length, 1);
        test.equal(c.rhs.extras[0], 2);

        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'f1');
        test.equal(c.rhs.whereCriteria[0].args.length, 3);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[0].name, 'name');
        test.equal(c.rhs.whereCriteria[0].args[0].index, 0);
        test.equal(c.rhs.whereCriteria[0].args[1].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[1].name, 'value');
        test.equal(c.rhs.whereCriteria[0].args[1].index, 1);
        test.equal(c.rhs.whereCriteria[0].args[2].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[2].name, 'zip');
        test.equal(c.rhs.whereCriteria[0].args[2].index, 2);
        test.done();
    },

    'udf-with-join-column-args': function(test) {
        var q = 'select a2.name from a1 as a1, a2 as a2 where a1.name = a2.name and f1(a1.name)';
        var c = compiler.compile(q);
        test.equal(c.rhs.columns.length, 1);
        test.equal(c.rhs.columns[0].type, 'column');
        test.equal(c.rhs.columns[0].name, 'a1.name');
        test.equal(c.rhs.selected[0].from, 'joiner');
        test.equal(c.rhs.selected[0].index, 0);
        test.equal(c.rhs.selected[1].from, 'main');
        test.equal(c.rhs.selected[1].index, 0);
        test.equal(c.rhs.udfExtras.length, 1);
        test.equal(c.rhs.udfExtras[0], 1);
        test.equal(c.rhs.whereCriteria.length, 1);
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'f1');
        test.equal(c.rhs.whereCriteria[0].args.length, 1);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[0].name, 'a1.name');
        test.done();
    },

    'udf-with-join-col-args-both': function(test) {
        var q = 'select a2.name from a1 as a1, a2 as a2 where a1.name = a2.name and f1(a1.name, a2.some)';
        var c = compiler.compile(q);
        test.equal(c.rhs.columns.length, 1);
        test.equal(c.rhs.columns[0].type, 'column');
        test.equal(c.rhs.columns[0].name, 'a1.name');
        test.equal(c.rhs.selected[0].from, 'joiner');
        test.equal(c.rhs.selected[0].index, 0);
        test.equal(c.rhs.selected[1].from, 'main');
        test.equal(c.rhs.selected[1].index, 0);
        test.equal(c.rhs.udfExtras.length, 2);
        test.equal(c.rhs.udfExtras[0], 1);
        test.equal(c.rhs.udfExtras[1], 2);
        test.equal(c.rhs.whereCriteria.length, 1);
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'f1');
        test.equal(c.rhs.whereCriteria[0].args.length, 2);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[0].name, 'a1.name');
        test.equal(c.rhs.whereCriteria[0].args[1].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[1].name, 'a2.some');
        test.deepEqual(c.rhs.joiner.columns, [
            {
               "type": "column",
               "name": "a2.name"
            },
            {
               "type": "column",
               "name": "a2.some",
                "for": "udf"
            }
        ]);
        test.done();
    },

    'udf-with-join-literal-args': function(test) {
        var q = 'select a2.name from a1 as a1, a2 as a2 where a1.name = a2.name and f1("{a1.$..name}")';
        var c = compiler.compile(q);
        test.equal(c.rhs.columns.length, 1);
        test.equal(c.rhs.columns[0].type, 'column');
        test.equal(c.rhs.columns[0].name, 'a1.name');
        test.equal(c.rhs.selected[0].from, 'joiner');
        test.equal(c.rhs.selected[0].index, 0);
        test.equal(c.rhs.extras.length, 1);
        test.equal(c.rhs.extras[0], 0);
        test.equal(c.rhs.whereCriteria.length, 1);
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'f1');
        test.equal(c.rhs.whereCriteria[0].args.length, 1);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'literal');
        test.equal(c.rhs.whereCriteria[0].args[0].value, '{a1.$..name}');
        test.done();
    },

    'udf-with-join-col': function(test) {
        var q = 'select a2.name, a2.details, a1.keys from a1 as a1, a2 as a2 where a1.name = a2.name and udfs.matchKeys(a1.name)';
        var c = compiler.compile(q);
        test.equal(c.rhs.columns.length, 2);
        test.equal(c.rhs.columns[0].type, 'column');
        test.equal(c.rhs.columns[0].name, 'a1.keys');
        test.equal(c.rhs.columns[1].type, 'column');
        test.equal(c.rhs.columns[1].name, 'a1.name');
        test.equal(c.rhs.selected[0].from, 'joiner');
        test.equal(c.rhs.selected[0].index, 0);
        test.equal(c.rhs.selected[1].from, 'joiner');
        test.equal(c.rhs.selected[1].index, 1);
        test.equal(c.rhs.selected[2].from, 'main');
        test.equal(c.rhs.selected[2].index, 0);
        test.equal(c.rhs.selected[3].from, 'main');
        test.equal(c.rhs.selected[3].index, 1);
        test.equal(c.rhs.udfExtras.length, 1);
        test.equal(c.rhs.udfExtras[0], 3);

        test.equal(c.rhs.whereCriteria.length, 1);
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'udfs.matchKeys');
        test.equal(c.rhs.whereCriteria[0].args.length, 1);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[0].name, 'a1.name');
        test.equal(c.rhs.whereCriteria[0].args[0].index, 3);
        test.done();
    },

    'udf-with-join-from-first-with-alias': function(test) {
        var q = 'select a2.name as name, a2.details as details from a1 as a1, a2 as a2 where a1.name = a2.name and udfs.matchKeys(a1.name, a1.keys)';
        var c = compiler.compile(q);
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'udfs.matchKeys');
        test.equal(c.rhs.whereCriteria[0].args.length, 2);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[0].name, 'a1.name');
        test.equal(c.rhs.whereCriteria[0].args[0].alias, 'a1.name');
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[1].name, 'a1.keys');
        test.equal(c.rhs.whereCriteria[0].args[1].alias, 'a1.keys');
        test.equal(c.rhs.selected[2].from, 'main');
        test.equal(c.rhs.selected[3].from, 'main');
        test.equal(c.rhs.columns[0].name, 'a1.name');
        test.equal(c.rhs.columns[1].name, 'a1.keys');
        test.done();
    },

    'udf-with-join-from-second-with-alias': function(test) {
        var q = 'select a2.name as name, a2.details as details from a1 as a1, a2 as a2 where a1.name = a2.name and udfs.matchKeys(a2.name, a2.details)';
        var c = compiler.compile(q);
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'udfs.matchKeys');
        test.equal(c.rhs.whereCriteria[0].args.length, 2);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[0].name, 'a2.name');
        test.equal(c.rhs.whereCriteria[0].args[0].index, 0);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[1].name, 'a2.details');
        test.equal(c.rhs.whereCriteria[0].args[1].index, 1);
        test.equal(c.rhs.selected[0].from, 'joiner');
        test.equal(c.rhs.selected[1].from, 'joiner');
        test.equal(c.rhs.selected[0].name, 'name');
        test.equal(c.rhs.selected[1].name, 'details');
        test.done();
    },

    'udf-with-join-from-both-with-alias': function(test) {
        var q = 'select a2.name as name, a2.details as details from a1 as a1, a2 as a2 where a1.name = a2.name and udfs.matchKeys(a1.name, a1.keys, a2.name, a2.details)';
        var c = compiler.compile(q);
        test.equal(c.rhs.whereCriteria[0].operator, 'udf');
        test.equal(c.rhs.whereCriteria[0].name, 'udfs.matchKeys');
        test.equal(c.rhs.whereCriteria[0].args.length, 4);
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[0].name, 'a1.name');
        test.equal(c.rhs.whereCriteria[0].args[0].type, 'column');
        test.equal(c.rhs.whereCriteria[0].args[1].name, 'a1.keys');
        test.equal(c.rhs.columns[0].name, 'a1.name');
        test.equal(c.rhs.columns[1].name, 'a1.keys');

        test.equal(c.rhs.selected[0].from, 'joiner');
        test.equal(c.rhs.selected[1].from, 'joiner');
        test.equal(c.rhs.selected[0].name, 'name');
        test.equal(c.rhs.selected[1].name, 'details');
        test.done();
    }
};
