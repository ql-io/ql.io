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

var ql = require('./peg/ql.js'),
    assert = require('assert'),
    strParser = require('ql.io-str-template')
    _ = require('underscore')

'use strict'

exports.version = require('../package.json').version;

var cache = {};
exports.compile = function(script) {
    assert.ok(script, 'script is undefined');

    var compiled, cooked, cacheKey;

    cacheKey = script;
    cooked = cache[cacheKey];
    if(cooked) {
        return cooked;
    }

    compiled = ql.parse(script);
    cooked = plan(compiled);
    if(Object.seal) {
        cooked = Object.freeze(cooked);
    }
    cache[cacheKey] = cooked;

    return cooked;
}

// Convert the compiled statements into an execution plan.
// Once done, this returns a 'return' statement and its dependencies
function plan(compiled) {
    // Collect all assignments
    var symbols = {}, i, line;
    var ret, single, count = 0;
    var comments = [];
    var creates = {};
    var maxid = 0;
    for(i = 0; i < compiled.length; i++) {
        line = compiled[i];
        maxid = line.id > maxid ? line.id : maxid;
        // Collect the statements and assign them to the following non-comment.
        if(line.type === 'comment') {
            comments.push(line);
            continue;
        }

        if(comments.length > 0) {
            // Assign comments now.
            line.comments = comments;
            comments = [];
        }

        if(line.assign) {
            if(symbols[line.assign]) {
                throw new this.SyntaxError('Duplicate symbol ' + line.assign);
            }
            else {
                symbols[line.assign] = line;
            }
            single = line;
        }
        else if(line.type === 'create') { // Makes sense when DDL is inline
            symbols[line.name] = line;
            creates[line.id.toString()] = line;
        }
        else {
            single = line;
        }
        if(line.type !== 'comment' && line.type !== 'create' && line.type !== 'return') {
            count++;
        }
        if(line.type === 'return') {
            ret = line;
        }
    }
    if(!ret) {
        if(single) {
            // Make up a return statement so that there is always a return statement
            // when there is an executable statement in the script
            ret = {
                type: 'return',
                line: single.line,
                id: maxid + 1,
                rhs: single
            }
        }
        else {
            // If there is no executable script, just return the compiled statements as they are.
            ret = {
                type: 'return',
                line: 1,
                id: maxid + 1,
                rhs: {
                    object: {},
                    type: 'define',
                    line: 1
                },
                comments: comments
            };
        }
    }

    // Start with the return statement and create the plan.
    walk(ret, symbols);
    if(ret.rhs) {
        _.each(ret.rhs.dependsOn, function(dependency) {
            ret.dependsOn.push(dependency);
        });
        delete ret.rhs.dependsOn;
    }

    // Reverse links from dependencies and pickup orphans
    // TODO: no extra walk necessary
    var used = [];
    function rev(node) {
        used.push(node.id);
        _.each(node.dependsOn, function(dependency) {
            dependency.listeners = dependency.listeners || [];
            dependency.listeners.push(node);
            if(dependency.fallback) {
                dependency.fallback.listeners = dependency.fallback.listeners || [];
                dependency.fallback.listeners.push(node);
            }
            used.push(dependency.id);
            rev(dependency);
        });
        if(node.fallback) {
            rev(node.fallback);
        }
    }
    rev(ret);
    rev(ret.rhs);

    // Insert all orphans at the beginning of dep arr. Orphans occur when depednencies are based on
    // body templates but the language has no way of knowing such dependencies.
    // Orphans include create table statements.
    var orphans = [];
    creates = [];
    _.each(compiled, function(line) {
        if(line.type !== 'return' && used.indexOf(line.id) === -1) {
            if(line.type === 'create') {
                creates.push(line);
            }
            else {
                orphans.push(line);
            }
            line.listeners = line.listeners || [];
            line.listeners.push(ret);
        }
    });
    // Insert creates before orphans.
    ret.dependsOn = orphans.concat(ret.dependsOn);
    ret.dependsOn = creates.concat(ret.dependsOn);

    return ret;
}

// Recursively walk up from the return statement to create the dependency tree.
function walk(line, symbols) {
    var type = line.type, dependency;
    line.dependsOn = line.dependsOn || [];
    switch(type) {
        case 'define':
            introspectObject(line.object, symbols, line.dependsOn);
            break;
        case 'return':
            if(line.rhs.type === 'define') {
                introspectObject(line.rhs.object, symbols, line.dependsOn);
            }
            else if(line.rhs.ref) {
                dependency = symbols[line.rhs.ref];
                if(dependency) {
                    addDep(line.dependsOn, dependency, symbols);
                }
            }
            else if(line.rhs) {
                walk(line.rhs, symbols);
            }

            // Route
            if(line.route) {
                introspectString(line.route.path, symbols, line.dependsOn);
                if(line.route.headers) {
                    _.each(line.route.headers, function(value, name) {
                        introspectString(value, symbols, line.dependsOn);
                        introspectString(name, symbols, line.dependsOn);
                    })
                }
            }
            break;
        case 'delete':
            introspectFrom(line, [line.source], symbols);
            line = introspectWhere(line, symbols);
            if(line.fallback) {
                walk(line.fallback, symbols);
            }
            break;
        case 'insert':
            introspectFrom(line, [line.source], symbols);
            if(line.fallback) {
                walk(line.fallback, symbols);
            }
            break;
        case 'select':
            introspectFrom(line, line.fromClause, symbols);
            introspectWhere(line, symbols);
            if(line.joiner) {
                introspectFrom(line.joiner, line.joiner.fromClause, symbols, line);
                introspectWhere(line.joiner, symbols, line);
            }
            if(line.fallback) {
                walk(line.fallback, symbols);
            }
            break;
    }
}

function addDep(dependsOn, dependency, symbols) {
    var contains = false;
    for(var i = 0; i < dependsOn.length; i++) {
        contains = _.isEqual(dependsOn[i], dependency);
        if(contains) {
            break;
        }
    }
    if(!contains) {
        dependsOn.push(dependency);
        walk(dependency, symbols);
    }
}

//
// Introspection utils
//
function introspectString(v, symbols, dependsOn) {
    try {
        var parsed = strParser.parse(v);
        _.each(parsed.vars, function(refname) {
            var index = refname.indexOf('.');
            if(index > 0) {
                refname = refname.substring(0, index);
            }
            var dependency = symbols[refname];
            if(dependency) {
                var contains = false;
                for(var i = 0; i < dependsOn.length; i++) {
                    contains = _.isEqual(dependsOn[i], dependency);
                    if(contains) {
                        break;
                    }
                }
                if(!contains) {
                    addDep(dependsOn, dependency, symbols);
                }
            }
        });
    }
    catch(e) {
        // Ignore
    }
}

function introspectObject(obj, symbols, dependsOn) {
    if(_.isString(obj)) {
        introspectString(obj, symbols, dependsOn);
    }
    else if(_.isArray(obj)) {
        _.each(obj, function(v) {
            introspectObject(v, symbols, dependsOn);
        });
    }
    else if(_.isObject(obj)) {
        _.each(obj, function(v, n) {
            if(_.isString(v)) {
                introspectString(v, symbols, dependsOn);
            }
            else if(_.isArray(v)) {
                var arr = [];
                _.each(v, function(vi) {
                    introspectObject(vi, symbols, dependsOn);
                });
                ret[n] = arr;
            }
            else {
                introspectObject(v, symbols, dependsOn);
            }
        });
    }
}

function introspectFrom(line, froms, symbols, parent) {
    var j, from, refname, dependency;
    for(j = 0; j < froms.length; j++) {
        from = froms[j];
        if(from.name.indexOf('{') === 0) {
            refname = from.name.substring(1, from.name.length - 1);
            dependency = symbols[refname];
            if(dependency) {
                if(line.assign === refname) {
                    throw new this.SyntaxError('Circular reference ' + line.assign);
                }
                else {
                    if(parent) {
                        addDep(parent.dependsOn, dependency, symbols);
                    }
                    else {
                        addDep(line.dependsOn, dependency, symbols);
                    }
                }
            }
        }
        else if(symbols[from.name]) {
            refname = from.name
            dependency = symbols[refname];
            if(dependency) {
                if(line.assign === refname) {
                    throw new this.SyntaxError('Circular reference ' + line.assign);
                }
                else {
                    if(parent) {
                        addDep(parent.dependsOn, dependency, symbols);
                    }
                    else {
                        addDep(line.dependsOn, dependency, symbols);
                    }
                }
            }
        }
    }
}

function introspectWhere(line, symbols, parent) {
    var j, where, k, ref, refname, index, dependency;
    line.dependsOn = line.dependsOn || [];
    if(line.whereCriteria) {
        for(j = 0; j < line.whereCriteria.length; j++) {
            where = line.whereCriteria[j];
            switch(where.operator) {
                case 'in' :
                    if(_.isArray(where.rhs.value)) {
                        for(k = 0; k < where.rhs.value.length; k++) {
                            ref = where.rhs.value[k];
                            if(_.isString(ref) && ref.indexOf('{') === 0) {
                                if(ref.indexOf('{^') == 0) {
                                    refname = ref.substring(2, ref.length - 1);
                                    var to = parent || line;
                                    to.preRequisites = to.preRequisites || [];
                                 	to.preRequisites.push(refname);
                                 	where.rhs.value[k] = where.rhs.value[k].replace('{^','{');
                                }
                                else {
                                    refname = ref.substring(1, ref.length - 1);
                                }
                                index = refname.indexOf('.');
                                if(index > 0) {
                                    refname = refname.substring(0, index);
                                }
                                dependency = symbols[refname];
                                if(line.assign === refname) {
                                    throw new this.SyntaxError('Circular reference ' + line.assign);
                                }
                                else if(dependency) {
                                    addDep(line.dependsOn, dependency, symbols);
                                }
                            }
                        }
                    }
                    else if(where.rhs.type === 'select') {
                        introspectFrom(where.rhs, where.rhs.fromClause, symbols, line);
                        introspectWhere(where.rhs, symbols, parent || line);
                    }
                    break;
                case '=' :
                    ref = where.rhs.value;
                    if(_.isString(ref) && ref.indexOf('{') === 0) {
                        if(ref.indexOf('{^') == 0) {
                            refname = ref.substring(2, ref.length - 1);
                            var to = parent || line;
                            to.preRequisites = to.preRequisites || [];
                         	to.preRequisites.push(refname);
                         	where.rhs.value = where.rhs.value.replace('{^','{');
                        }
                        else {
                            refname = ref.substring(1, ref.length - 1);
                        }
                        index = refname.indexOf('.');
                        if(index > 0) {
                            refname = refname.substring(0, index);
                        }
                        dependency = symbols[refname];
                        if(dependency) {
                            if(line.assign === refname) {
                                throw new this.SyntaxError('Circular reference ' + line.assign);
                            }
                            else {
                                addDep(line.dependsOn, dependency, symbols);
                            }
                        }
                    }
                    break;
                case 'udf':
                    refname = where.name;
                    index = refname.indexOf('.');
                    if(index > 0) {
                        refname = refname.substring(0, index);
                    }
                    dependency = symbols[refname];
                    if(dependency) {
                        if(line.assign === refname) {
                            throw new this.SyntaxError('Circular reference ' + line.assign);
                        }
                        else {
                            addDep(line.dependsOn, dependency, symbols);
                        }
                    }
                    else {
                        throw new this.SyntaxError('UDF ' + where.name + ' not resolved')
                    }
                    break;
            }
        }
    }
    return line;
}
