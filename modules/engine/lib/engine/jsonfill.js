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
    jsonPath = require('JSONPath'),
    strTemplate = require('./peg/str-template.js'),
    assert = require('assert');

exports.fill = fill;
exports.project = project;
exports.lookup = lookup;
exports.unwrap = unwrap;

function fill(obj, bag) {
    var ret = _.isArray(obj) ? [] : {};
    if(_.isArray(obj) || _.isObject(obj)) {
        _.each(obj, function(v, n) {
            if(_.isString(v)) {
                ret[n] = lookup(v, bag);
            }
            else if(_.isArray(v)) {
                var arr = [];
                _.each(v, function(vi) {
                    if(_.isObject(vi)) {
                        arr.push(fill(vi, bag));
                    }
                    else {
                        arr.push(lookup(vi, bag));
                    }
                });
                ret[n] = arr;
            }
            else {
                ret[n] = fill(v, bag);
            }
        });
    }
    else {
        ret = lookup(obj, bag);
    }
    return ret;
}

function lookup(key, bag) {
    var ref, index, obj = key, path, resource, stripped = 0, i, template;
    if(key && _.isString(key) && key.indexOf("{") === 0 && key.lastIndexOf("}") === key.length - 1) {
        // Preprocess with a string tokenizer to process any nested tokens.
        template = strTemplate.parse(key);
        key = template.format(bag, true);
        // If key is fully resolved, no need to run the rest of the code.
        if(key.indexOf("{") === 0 && key.lastIndexOf("}") === key.length - 1) {
            ref = key.substring(1, key.length - 1);
            path = ref;
            index = ref.indexOf('.');
            if(index > 0) {
                ref = path.substring(0, index);
                path = path.substring(index + 1);
            }
            else {
                path = '';
            }

            resource = bag[ref];
            if(resource) {
                // Strip
                if(_.isArray(resource) && resource.length == 1 && _.isArray(resource[0]) && resource[0].length === 1) {
                    resource = resource[0];
                    stripped++;
                    resource = resource[0];
                    stripped++;
                }

                if(path === '') {
                    obj = resource;
                    for(i = 0; i < stripped; i++) {
                        obj = [obj];
                    }
                }
                else {
                    obj = projectOne(path, resource, bag);
                }
            }
            else {
                obj = undefined;
            }
        }
        else {
            obj = key;
        }
    }
    else if(bag.hasOwnProperty(key)) {
        obj = bag[key];
    }
    return obj;
}

function projectOne(name, items, bag) {
    if(_.isArray(items)) {
        var arr = [];
        _.each(items, function(item) {
            arr.push(projectOne_(name, item, bag));
        })
        return arr;
    }
    else {
        return projectOne_(name, items, bag);
    }
}
function projectOne_(name, item, bag) {
    var obj = jsonPath.eval(item, name.trim(), {flatten: true, wrap: false, sandbox: bag});
    // JSONPath returns false when there is no match. This leads to 'false' values. Switch to undefined.
    return obj ? obj : undefined;
}

function project(columns, items, bag, offset, limit) {
    var filtered = [], holder;
    if(_.isArray(items)) {
        var start = offset ? offset : 0;
        for(var i = start; i < items.length; i++) {
            holder = projectEach(items[i], columns, bag);
            filtered.push(holder);
            if(limit && filtered.length >= limit) {
                break;
            }
        }
    }
    else {
        holder = projectEach(items, columns, bag);
        filtered.push(holder);
    }
    return filtered;
}


// Given an item, filter it by column names, and attach the projected properties to the holder.
function projectEach(item, columns, bag) {
    // If columns have aliases, each row in the result set will be an object. If not, an array.
    var holder = columns[0].alias ? {} : [], name, flatten, obj;
    _.each(columns, function(column) {
        // Flatten results as the selector may include '..'
        name = column.name.trim();
        flatten = name.indexOf('..') >= 0;
        obj = jsonPath.eval(item, name, {flatten: flatten, sandbox: bag});
        if(obj == false) obj = undefined;
        if(obj && _.isArray(obj) && obj.length == 1) {
            obj = obj[0];
        }
        if(column.alias) {
            holder[column.alias] = obj;
        }
        else {
            holder.push(obj);
        }
    });
    if(holder.length === 1) {
        return holder[0];
    }
    else {
        return holder;
    }
}

// Unwrap object wrappers when possible
function unwrap(obj) {
    if(_.isArray(obj) && obj.length == 1 && _.isArray(obj[0]) && obj[0].length == 1) {
        obj = obj[0];
        obj = obj[0];
    }
    return obj;
}