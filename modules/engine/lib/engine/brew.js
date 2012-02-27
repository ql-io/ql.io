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

/**
 * Converts DDL scripts into a tables
 */

'use strict';

var compiler = require('ql.io-compiler'),
    Table = require('./source/table.js'),
    assert = require('assert'),
    _ = require('underscore');

exports.go = function(options) {
    var statements, comments, table;
    var root = options.path;
    var name = options.name;
    var script = options.script;
    var statement = options.statement;
    var cb = options.cb;
    var logEmitter = options.logEmitter;

    assert.ok(root, 'Root directory is undefined');
    assert.ok(script || statement, 'Script is undefined');
    assert.ok(cb, 'Callback undefined');

    // Compile the DDL and post process
    try {
        statements = statement ? [statement] : compiler.compile(script);
        comments = [];
        _.each(statements, function(statement) {
            switch(statement.type) {
                case 'comment' :
                    comments.push(statement.text);
                    break;
                case 'create' :
                    table = new Table(options, comments, statement);
                    comments = []; // Reset comments for later statements in the script
                    cb(null, table);
                    break;
                default:
                    logEmitter.emitWarning("Unsupported statement in " + root + name);
            }
        });
    }
    catch(e) {
        logEmitter.emitError('Failed to load ' + root + name, e);
        cb(e);
    }
}

