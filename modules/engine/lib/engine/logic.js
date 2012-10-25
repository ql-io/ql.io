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
var _ = require('underscore'),
    assert = require('assert');
exports.exec = function(opts, statement, parentEvent, cb) {
    statement.result = calculate(statement, opts.context);
    logicTx = opts.logEmitter.beginEvent({
        parent: parentEvent,
        type: 'logic',
        message: {
            line: statement.line
        },
        cb: cb});
    logicTx.cb(null, statement.result);
}

exports.findResult = function(statement) {
    var sofar = statement;
    while(sofar){
        if(sofar.result){
            return sofar.result;
        }
        sofar = sofar.fallback;
    }
    return false;
}

function calculate(condition, context){
    assert.ok(condition, 'Condition is missing.');
    assert.ok(condition.logic, 'Condition is in unexpected form. Need to have logic field.');
    assert.ok(condition.values, 'Condition is in unexpected form. Need to have values field.');
    assert.ok(context, 'context is missing.')
    switch(condition.logic){
        case 'and':
            return _.all(condition.values, function(onecond){
                return calculate(onecond, context);
            });
        case 'not':
            return !calculate(condition.values, context);
        default://normal
            return !!context[condition.values];
    }
}