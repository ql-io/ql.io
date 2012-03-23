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

'use strict';

var jsonfill = require('./jsonfill.js'),
    async = require('async'),
    _util = require('./util.js'),
    _ = require('underscore'),
    select = require('./select.js');

//
// Preps the where clause, once done hands off to cb
//
exports.exec = function(opts, where, cb, selectExecTx) {
    var context = opts.context, key;

    //
    // Analyze where conditions and fetch any dependent data
    var name, ret;
    var tasks = [];
    _.each(where, function(cond) {
        if(cond.operator === '=') {
            name = cond.lhs.name;
            //
            // This is a string value. No need to do any remote fetch.
            // This is a curry. There are more curried functions below. If you don't know
            // what currying is, don't touch this code unless you read Crockford's book.
            tasks.push(function(cond, name) {
                return function(callback) {
                    ret = {};
                    key = (cond.rhs.value !== undefined) ? cond.rhs.value : cond.rhs;
                    ret[name] = jsonfill.lookup(key, context);
                    callback(null, ret);
                };
            }(cond, name));
        }
        //
        // This is an IN condition. RHS could be a comma separated values or a SELECT
        else if(cond.operator === 'in') {
            name = cond.lhs.name;
            if(cond.rhs.fromClause) {
                tasks.push(function(cond, name) {
                    return function(callback) {
                        select.exec(opts, cond.rhs, function(e, r) {
                            if(e) {
                                callback(e);
                            }
                            else {
                                ret = {};
                                ret[name] = r.body;
                                callback(null, ret);
                            }
                        }, selectExecTx.event);
                    };
                }(cond, name));
            }
            else if(_.isArray(cond.rhs.value)) {
                tasks.push(function(cond, name) {
                    return function(callback) {
                        ret = {};
                        ret[name] = [];

                        // Determine whether the number of values is within the limit and prune the values array
                        var maxRequests = _util.getMaxRequests(opts.config, opts.logEmitter);
                        if (cond.rhs.value.length > maxRequests) {
                            opts.logEmitter.emitWarning('Pruning the number of nested requests in in-clause to config.maxNestedRequests = ' + maxRequests + '.');
                            cond.rhs.value = cond.rhs.value.slice(0, maxRequests);
                        }

                        // Expand variables from context
                        _.each(cond.rhs.value, function(key) {
                            var arr = jsonfill.lookup(key, context);
                            if(_.isArray(arr)) {
                                _.each(arr, function(v) {
                                    ret[name].push(v);
                                });
                            }
                            else {
                                ret[name].push(arr);
                            }
                        });
                        callback(null, ret);
                    };
                }(cond, name));
            }
        }
    });

    // Run tasks asynchronously and join on the callback. On completion, the results array will
    // have the values to execute this statement
    async.parallel(tasks, function(err, results) {
            cb(err, results);
    });
}
