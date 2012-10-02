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

'use strict';

var _ = require('underscore'),
    assert = require('assert');

exports.exec = function(opts, statement, parentEvent, cb) {
    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(statement, 'Argument cb can not be undefined');

    var tables = opts.tables, context = opts.context,
        request = opts.request, emitter = opts.emitter,
        ifTx = opts.logEmitter.beginEvent({
            parent: parentEvent,
            type: 'if',
            message: {
                line: statement.line
            },
            cb: cb}),
        mycondition = !!context[statement.condition];

    ifTx.cb(undefined, mycondition)


}
