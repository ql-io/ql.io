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

var compiler = require('../lib/compiler'),
    _ = require('underscore');

module.exports = {
    'define-dependency' : function(test) {
        var script, plan;
        script = 'a = "a";\
                  b = "{a}";\
                  c = "{b}";\
                  return c;'
        plan = compiler.compile(script);
        test.equals(plan.dependsOn.length, 1);
        test.equals(plan.dependsOn[0].object, '{b}');
        test.equals(plan.dependsOn[0].dependsOn.length, 1);
        test.equals(plan.dependsOn[0].dependsOn[0].object, '{a}');
        test.equals(plan.dependsOn[0].dependsOn[0].dependsOn.length, 1);
        test.equals(plan.dependsOn[0].dependsOn[0].dependsOn[0].object, 'a');
        test.done();
    },

    'str-template': function(test) {
        var script = 'config = {\
                  "p1": "v1",\
                  "ua": "safari",\
                  "safari": {\
                     "apikey": "1234"\
                   }\
                };\
                c = "{config.{config.ua}.apikey}";\
                return c;';
        var plan = compiler.compile(script);
        var e = { type: 'return',
          line: 1,
          id: 2,
          rhs: { ref: 'c' },
          dependsOn:
           [ { object: '{config.{config.ua}.apikey}',
               type: 'define',
               line: 1,
               assign: 'c',
               id: 1,
               dependsOn:
                [ { object: { p1: 'v1', ua: 'safari', safari: { apikey: '1234' } },
                    type: 'define',
                    line: 1,
                    assign: 'config',
                    id: 0,
                    dependsOn: [] } ] } ] };
        test.equals(plan.dependsOn.length, 1);
        test.equals(plan.dependsOn[0].type, 'define');
        test.equals(plan.dependsOn[0].object, '{config.{config.ua}.apikey}');
        test.equals(plan.dependsOn[0].dependsOn.length, 1);
        test.equals(plan.dependsOn[0].dependsOn[0].type, 'define');
        test.deepEqual(plan.dependsOn[0].dependsOn[0].object, { p1: 'v1', ua: 'safari', safari: { apikey: '1234' } });
        test.done();
    },

    'route-with-headers': function(test) {
        var q = "name = \"hello\";return {} via route '/foo/bar' using method get using headers '{name}' = 'B', 'B' = 'C';";
        var plan = compiler.compile(q);
        test.equals(plan.dependsOn.length, 1);
        test.equals(plan.dependsOn[0].type, 'define');
        test.equals(plan.dependsOn[0].assign, 'name');
        test.done();
    }
};
