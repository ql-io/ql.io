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

'use strict'

var jsonfill = require('./jsonfill.js'),
    _ = require('underscore'),
    jsonPath = require('JSONPath'),
    assert = require('assert');

exports.reject = function(resource, statement, context, source) {
    return _iterate(resource, statement, context, source, false);
};

exports.filter = function(resource, statement, context, source) {
    return _iterate(resource, statement, context, source, true);
};

function _iterate(resource, statement, context, source, keep) {
    var i, j;
    resource = jsonfill.unwrap(resource);

    // Local filtering (rudimentary)
    // Prep expected once
    var expecteds = _.map(statement.whereCriteria, function (cond) {
        var expected = [];
        if(cond.operator === 'in') {
            _.each(cond.rhs.value, function (val) {
                expected = expected.concat(jsonfill.fill(val, context));
            });
        }
        else if(cond.operator === '=') {
            expected = expected.concat(jsonfill.fill(cond.rhs.value, context));
        }
        else {
            assert.ok(cond.operator === '=', 'Local filtering supported for = only');
        }
        return expected;
    });
    // Wrap into an array if source is not an array. Otherwise we will end up
    // iterating over its props.
    var filtered = [];
    if(statement.whereCriteria && statement.whereCriteria.length > 0) {
        filtered = _.isArray(resource) ? resource : [resource];
        // All and conditions should match. If the RHS of a condition
        // has multiple values, they are ORed.
        //
        for(i = 0; i < statement.whereCriteria.length; i++) {
            var cond = statement.whereCriteria[i];
            var expected = expecteds[i];
            var path = cond.lhs.name;
            if(path.indexOf(source.alias + '.') === 0) {
                path = path.substr(source.alias.length + 1);
            }

            var op = keep ? _.filter : _.reject
            filtered = op(filtered, function (row) {
                var matched = false;
                var result = jsonPath.eval(row, path, {flatten: true});
                // If the result matches any expected[], keep it.
                for(j = 0; j < expected.length; j++) {
                    if(!matched && result && _.isArray(result) && result.length == 1 && result[0] == expected[j]) {
                        matched = true;
                    }
                }
                return matched;
            });
        }
    }
    else {
        // If there are no where conditions, use the original
        filtered = keep ? resource : [];
    }
    return filtered;
}
