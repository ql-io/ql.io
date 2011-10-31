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
    _ = require('underscore')

"use strict"

//
// TODO: Most of this code should move to ql.peg
//
var cache = {};
exports.compile = function(script) {
    var compiled, cooked, cacheKey;

    cacheKey = script;
    cooked = cache[cacheKey];
    if(cooked) {
        return cooked;
    }

    compiled = ql.parse(script);
    cooked = cook(compiled);
    if(Object.seal) {
        cooked = Object.freeze(cooked);
    }
    cache[cacheKey] = cooked;

    return cooked;
}

function cook(compiled) {
    // Pass 0: One line - no need for cooking
    if(compiled.length === 1) {
        return compiled;
    }

    // Pass 1: collect all assignments
    var symbols = {}, cooked = [], count, hasReturn, i, line;
    for(i = 0; i < compiled.length; i++) {
        line = compiled[i];
        line.dependsOn = [];
        line.listeners = [];
        if(line.joiner) {
            line.joiner.dependsOn = [];
            line.joiner.listeners = [];
        }
        if(line.assign) {
            if(symbols[line.assign]) {
                throw new this.SyntaxError("Duplicate symbol " + line.assign);
            }
            else {
                symbols[line.assign] = line;
            }
        }
        else if(line.type === 'create') { // Makes sense when DDL is inline
            symbols[line.name] = line;
        }
    }

    // TODO: Get rid of statements with no dependencies

    // Pass 2: wire up dependencies between statements
    for(i = 0; i < compiled.length; i++) {
        introspect(compiled[i], cooked, symbols);
    }

    // Check for return statements
    // Return is required if the number of statements excluding create table statements and comments is more than 1.
    count = 0;
    hasReturn = false;
    _.each(cooked, function(line) {
        if(line.type !== 'comment' && line.type !== 'create' && line.type !== 'return') {
            count++;
        }
        if(line.type === 'return') {
            hasReturn = true;
        }
    });
    if(count > 1 && !hasReturn) {
        throw new this.SyntaxError("Missing return statement");
    }
    return cooked;
}

// Introspect a statement for dependencies
function introspect(line, cooked, symbols) {
    var type = line.type, index, j, k, ref, refname, dependency, where;
    switch(type) {
        case 'object' :
        case 'comment' :
        case 'create' :
        case 'describe':
        case 'show':
        case 'insert' :
            cooked.push(line);
            break;
        case 'define' :
            introspectObject(line.object, symbols, line.dependsOn, line.id);
            cooked.push(line);
            break;
        case 'select' :
            // Find dependencies from fromClause
            findFrom(line, symbols);

            // Find dependencies from the joiner's fromClause
            if(line.joiner) {
                findFrom(line.joiner, symbols, line);
            }

            // Find dependencies in where
            if(line.whereCriteria) {
                for(j = 0; j < line.whereCriteria.length; j++) {
                    where = line.whereCriteria[j];
                    switch(where.operator) {
                        case 'in' :
                            if(_.isArray(where.rhs.value)) {
                                for(k = 0; k < where.rhs.value.length; k++) {
                                    ref = where.rhs.value[k];
                                    if(_.isString(ref) && ref.indexOf('{') === 0) {
                                        refname = ref.substring(1, ref.length - 1);
                                        index = refname.indexOf('.');
                                        if(index > 0) {
                                            refname = refname.substring(0, index);
                                        }
                                        dependency = symbols[refname];
                                        if(dependency) {
                                            line.dependsOn.push(dependency.id);
                                            dependency.listeners.push(line.id);
                                        }
                                    }
                                }
                            }
                            else if(where.rhs.type === 'select') {
                                findFrom(where.rhs, symbols, line);
                            }
                            break;
                        case '=' :
                            ref = where.rhs.value;
                            if(_.isString(ref) && ref.indexOf('{') === 0) {
                                refname = ref.substring(1, ref.length - 1);
                                index = refname.indexOf('.');
                                if(index > 0) {
                                    refname = refname.substring(0, index);
                                }
                                dependency = symbols[refname];
                                if(dependency) {
                                    line.dependsOn.push(dependency.id);
                                    dependency.listeners.push(line.id);
                                }
                            }
                            break;
                    }
                }
            }
            cooked.push(line);
            break;
        case 'return' :
            if(line.rhs.type === 'define') {
                introspectObject(line.rhs.object, symbols, line.dependsOn, line.id);
            }
            else if(line.rhs.type === 'ref') {
                dependency = symbols[refname];
                if(dependency) {
                    line.dependsOn.push(dependency.id);
                    dependency.listeners.push(id);
                }
            }
            else {
                // A statement
            }
            cooked.push(line);
            break;
        default:
    }
}

// Introspect return for dependencies
function introspectString(v, refname, index, dependency, symbols, dependsOn, id) {
    if(v.indexOf("{") === 0 && v.indexOf("}") === v.length - 1) {
        refname = v.substring(1, v.length - 1);
        index = refname.indexOf('.');
        if(index > 0) {
            refname = refname.substring(0, index);
        }
        dependency = symbols[refname];
        if(dependency) {
            dependsOn.push(dependency.id);
            dependency.listeners.push(id);
        }
    }
}

function introspectObject(obj, symbols, dependsOn, id) {
    var dependency, refname, index, arr = [];
    if(_.isString(obj)) {
        introspectString(obj, refname, index, dependency, symbols, dependsOn, id);
    }
    else {
        _.each(obj, function(v, n) {
            if(_.isString(v)) {
                introspectString(v, refname, index, dependency, symbols, dependsOn, id);
            }
            else if(_.isArray(v)) {
                arr = [];
                _.each(v, function(vi) {
                    introspectObject(vi, symbols, dependsOn, id);
                });
                ret[n] = arr;
            }
            else {
                introspectObject(v, symbols, dependsOn, id);
            }
        });
    }
}

// Find dependencies from from clause
// When the line is a joiner, we need to wire the dependencies with the parent and not the joiner.
function findFrom(line, symbols, parent) {
    var j, from, refname, dependency;
    for(j = 0; j < line.fromClause.length; j++) {
        from = line.fromClause[j];
        if(from.name.indexOf('{') === 0) {
            refname = from.name.substring(1, from.name.length - 1);
            dependency = symbols[refname];
            if(dependency) {
                if(parent) {
                    parent.dependsOn.push(dependency.id);
                    dependency.listeners.push(parent.id);
                }
                else {
                    line.dependsOn.push(dependency.id);
                    dependency.listeners.push(line.id);
                }
            }
        }
        else if(symbols[from.name]) {
            refname = from.name
            dependency = symbols[refname];
            if(dependency) {
                if(parent) {
                    parent.dependsOn.push(dependency.id);
                    dependency.listeners.push(parent.id);
                }
                else {
                    line.dependsOn.push(dependency.id);
                    dependency.listeners.push(line.id);
                }
            }
        }
    }
}

