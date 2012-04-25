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

var brew = require('./brew.js'),
    fs = require('fs'),
    assert = require('assert');

// TODO: Watch for file changes
exports.load = function (opts) {
    var rootdir = opts.tables;
    var logEmitter = opts.logEmitter;
    var config = opts.config;

    if(!rootdir) {
        return [];
    }
    var tables = {};

    logEmitter.emitEvent('Loading tables from ' + rootdir);
    loadInternal(rootdir, '', logEmitter, config, tables);
    return tables;

};

function loadInternal(path, prefix, logEmitter, config, tables) {
    assert.ok(path, 'path should not be null');
    assert.ok(config, 'config should not be null');
    assert.ok(tables, 'tables should not be null');

    var script, name, stats, paths;
    path = path.charAt(path.length - 1) == '/' ? path : path + '/';
    try {
        paths = fs.readdirSync(path);
    }
    catch(e) {
        logEmitter.emitError('Unable to load tables from ' + path);
        return;
    }

    paths.forEach(function(filename) {
        stats = fs.statSync(path + filename);
        if(stats.isDirectory()) {
             loadInternal(path + filename,
                 prefix.length > 0 ? prefix + '.' + filename : filename,
                 logEmitter, config, tables);
        }
        else if(stats.isFile() && /\.ql$/.test(filename)) {
            // Load script files from the disk
            script = fs.readFileSync(path + filename, 'utf8');

            name = filename.substring(0, filename.lastIndexOf('.'));

            // Get the semantic model
            brew.go({
                    path: path,
                    name: name,
                    config: config,
                    script: script,
                    logEmitter: logEmitter,
                    cb: function(err, table) {
                            if(err) {
                                logEmitter.emitError(err);
                            } else {
                                assert.ok(table, 'table should not be null');
                                tables[table.name] = table;
                            }
                        }
                    });
            }
    });
}
