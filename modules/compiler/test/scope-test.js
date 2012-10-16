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
    'try catch': function(test) {
        var q = "try {select * from aaa;\n\
        throw (asdf)}\n\
        catch (asdf){\n\
            a = 1\n\
        }\n\
        finally {select * from bbb}";
        var statement = compiler.compile(q);
        test.equals(statement.rhs.dependsOn.length, 2);
        test.equals(statement.rhs.catchClause.length, 1);
        test.equals(statement.rhs.catchClause[0].condition.values, 'asdf');
        test.equals(statement.rhs.catchClause[0].condition.logic, 'normal');
        test.equals(statement.rhs.finallyClause.length, 1);
        test.done();
    },
    'if else': function(test) {
        var q = "if (awef || wef && !jlk) {e = select * from f} else {g = select * from h}\n\
            return e || g";
        var statement = compiler.compile(q);
        test.equals(statement.rhs.dependsOn.length, 1);
        test.equals(statement.rhs.dependsOn[0].assign, 'e');
        test.ok(statement.rhs.dependsOn[0].scope);
        test.ok(statement.rhs.fallback);
        test.equals(statement.rhs.fallback.ref, 'g');
        test.done();
    }
};
