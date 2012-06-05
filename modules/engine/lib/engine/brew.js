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
    var root = options.path;
    var script = options.script;
    var statement = options.statement;
    var cb = options.cb;

    assert.ok(root, 'Root directory is undefined');
    assert.ok(script || statement, 'Script is undefined');
    assert.ok(cb, 'Callback undefined');

    // Compile the DDL and post process
    try {
        var plan = statement || compiler.compile(script);
        walk(options, plan);
    }
    catch(e) {
        console.log('Error loading ' + options.path + options.name + '.ql');
        console.log(e.stack || e)
        return cb({
            message: 'Error loading ' + options.path + options.name + '.ql',
            cause: e
        });
    }
}

function walk(options, statement) {
    if(statement.type === 'create') {
        var table = new Table(options, statement.comments, statement);
        options.cb(null, table);
    }
    _.each(statement.dependsOn, function(dependency) {
        walk(options, dependency);
    })
}

