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

var strTemplate = require('./peg/str-template.js'),
    compiler = require('ql.io-compiler'),
    uriTemplate = require('ql.io-uri-template'),
    assert = require('assert'),
    _ = require('underscore'),
    fs = require('fs'),
    normalize = require('path').normalize,
    markdown = require('markdown'),
    logEmitter =  require('./log-emitter.js');

exports.go = function(options) {
    var statements, text, comments, resource, bag = {
        config: options.config
    };
    var root = options.path;
    var name = options.name;
    var script = options.script;
    var statement = options.statement;
    var cb = options.cb;

    assert.ok(root, 'Root directory is undefined');
    assert.ok(script || statement, 'Script is undefined');
    assert.ok(cb, 'Callback undefined');

    // Compile the DDL and post process
    try {
        statements = statement ? [statement] : compiler.compile(script);
        comments = [];
        text = '';
        _.each(statements, function(statement) {
            switch(statement.type) {
                case 'comment' :
                    comments.push(statement.text);
                    break;
                case 'create' :
                    resource = cloneDeep(statement);
                    resource.meta = {
                        name: resource.name,
                        statements: []
                    }; // Metadata for describe
                    if(comments.length > 0) {
                        _.each(comments, function(comment) {
                            text += markdown.markdown.toHTML(comment);
                        });
                        resource.meta.comments = text;
                        comments = [];
                        text = '';
                    }

                    _process(resource['select'], 'select', bag, root, name, resource.meta.statements, cb);
                    _process(resource['insert'], 'insert', bag, root, name, resource.meta.statements, cb);
                    _process(resource['delete'], 'delete', bag, root, name, resource.meta.statements, cb);
                    cb(null, Object.freeze(resource));

                    break;
                default:
                    logEmitter.emitWarning("Unsupported statement in " + root + name);
            }
        });
    }
    catch(e) {
        logEmitter.emitError('Failed to load ' + root + name);
        cb(e);
    }
}

function _process(verb, type, bag, root, name, meta, cb) {
    if(!verb) {
        return;
    }

    var template, param, compiled;
    // Metadata
    var len = meta.push({
        params: []
    });
    meta = meta[len - 1];
    meta.type = type;
    if(verb.uri) {
        try {
            // Look for '{' and '}
            compiled = strTemplate.parse(verb.uri);
            verb.uri = compiled.format(bag, true);
        }
        catch(e) {
            // Continue as we can treat non-templates as usual
        }
        // Meta
        meta.uri = verb.uri;
        meta.method = verb.method.toUpperCase();
        try {
            template = uriTemplate.parse(verb.uri);
            _.each(template.stream, function(token) {
                if(token && token.variable) {
                    param = cloneDeep(token);
                    // Don't worry - there is an intentional typo here
                    param.defautl = verb.defaults ? verb.defaults[token.variable] : undefined;
                    meta.params.push(param);
                }
            });
        }
        catch(e) {
            logEmitter.emitWarning(e.message || e);
            return cb(e);
        }
    }
    if(verb.headers) {
        meta.headers = [];
        replace(verb.headers, bag, meta.headers);
    }
    if(verb.defaults) {
        meta.defaults = [];
        replace(verb.defaults, bag, meta.defaults);
    }
    if(verb.body) {
        // Load the file
        try {
            verb.body.content = fs.readFileSync(normalize(root + verb.body.template), 'utf8');
            meta.body = cloneDeep(verb.body);
        }
        catch(e) {
            cb(e);
        }
    }
    if(verb.patch) {
        var path = root + verb.patch;
        try {
            // Monkey patch is the compiled patch module
            verb.monkeyPatch = require(path);
        }
        catch(e) {
            cb(e);
        }
    }
    if(verb.auth) {
        try {
            // auth is the compiled auth module
            verb.auth = require(verb.auth);
        }
        catch(e) {
            logEmitter.emitError('Failed to load ' + name);
            cb(e);
        }
    }
}

// Replace headers and defaults
function replace(col, bag, meta) {
    var compiled;
    _.each(col, function(v, n) {
        try {
            compiled = strTemplate.parse(v);

            // Keep non-matching tokens here so that they can be replaced at engine.exec time.
            col[n] = compiled.format(bag, true);
            meta.push({
                name: n,
                value: col[n]
            })
        }
        catch(e) {
            // Ignore as we want to treat non-conformat strings as opaque
        }
    });
}

function cloneDeep(obj) {
    if(obj == null || typeof(obj) != 'object') {
        return obj;
    }

    var copy = obj.constructor();

    for(var key in obj) {
        copy[key] = cloneDeep(obj[key]);
    }
    return copy;
}
