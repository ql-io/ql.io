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
        var script, cooked;
        script = 'a = "a";\
                  b = "{a}";\
                  c = "{b}";\
                  return c;'
        try {
            cooked = compiler.compile(script);
            test.equals(cooked[0].listeners.length, 1);
            test.equals(cooked[0].listeners[0], 1);
            test.equals(cooked[1].dependsOn.length, 1);
            test.equals(cooked[1].dependsOn[0], 0);
            test.equals(cooked[1].listeners.length, 1);
            test.equals(cooked[1].listeners[0], 2);
            test.equals(cooked[2].dependsOn.length, 1);
            test.equals(cooked[2].dependsOn[0], 1);
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.fail(e);
            test.done();
        }
    }
};
