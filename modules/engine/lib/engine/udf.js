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

var jsonPath = require('JSONPath'),
    async = require('async'),
    _ = require('underscore');

exports.applyOnWhere = function(opts, statement, results, cb) {
    //
    // Iterative apply each UDF from the where clause.
    //
    // TODO: Short-circuit this when there are no UDFs
    if(statement.columns.name === '*') {
        var mods = results.body;
        // Iteratively apply UDF on mods
        var udfCalls = [];
        _.each(statement.whereCriteria, function (where) {
            udfCalls.push(function (w) {
                return function (callback) {
                    if(w.operator === 'udf') {
                        var fn = resolve(opts, statement.columns, statement.extras, w);
                        if(fn) {
                            fn(results.body, 0, results.body, function (err, mod) {
                                callback(err, mod);
                            });
                        }
                        else {
                            opts.logEmitter.emitError('User defined function ' + w.name + ' not defined');
                            // Return for backward compat
                            // TODO: Explain
                            callback(null, results.body);
                        }
                    }
                    else {
                        callback(null, mods);
                    }
                }
            }(where));
        });
        if(udfCalls.length > 0) {
            async.series(udfCalls, function (err, mods) {
                results.body = mods[0];
                return cb(null, results);
            })
        }
        else {
            return cb(null, results);
        }
    }
    else {
        var rows = results.body;
        // Iteratively apply UDF on mods
        // For each where cond, apply each UDF in series.
        // Applying UDF - process each row in parallel
        var udfCalls = [];
        _.each(statement.whereCriteria, function (where) {
            udfCalls.push(function (w) {
                return function (callback) {
                    if(w.operator === 'udf') {
                        var fn = resolve(opts, statement.columns, statement.extras, w);
                        if(fn) {
                            var rowFuncs = [];
                            _.each(rows, function (row, index) {
                                rowFuncs.push(function (r) {
                                    return function (callback) {

                                        fn(rows, index, row, function (err, mod) {
                                            return callback(err, mod);
                                        });
                                    };
                                }(row))
                            });
                            async.parallel(rowFuncs, function (err, mods) {
                                return callback(null, mods);
                            });
                        }
                        else {
//                                    callback({
//                                        message: 'User defined function ' + w.name  + ' not defined'
//                                    })
                            opts.logEmitter.emitError('User defined function ' + w.name + ' not defined');
                            // Return for backward compat
                            // TODO: Explain
                            callback(null, rows);
                        }
                    }
                    else {
                        return callback(null, rows);
                    }
                }
            }(where));
        });
        if(udfCalls.length > 0) {
            async.series(udfCalls, function (err, mods) {
                if(mods) {
                    results.body = mods[0];
                }
                return cb(err, results);
            })
        }
        else {
            return cb(null, results);
        }
    }
}

function resolve(opts, columns, extras, udf) {
    var fn = resolveUdf(opts, udf);
    if(fn) {
        return function(dataset, index, row, cb) {
            var args = prepareArgs(row, udf);

            // Remove extras from the row
            var _row;
            if(extras && extras.length > 0) {
                if(udf.args[0].alias) {
                    _row = row;
                    _.each(extras, function(extra) {
                        delete _row[columns[extra].alias];
                    });
                }
                else {
                    _row = [];
                    _.each(row, function(field, fi) {
                        if(extras.indexOf(fi) < 0) {
                            _row.push(field);
                        }
                    });
                }
            }
            else {
                _row = row;
            }
            var wrapper = {
                rows: dataset,
                row : _row,
                index: index,
                next: cb
            };
            fn.apply(wrapper, args);
        };
    }
    else {
        // Not found
        return null;
    }
}

function resolveUdf(opts, where) {
    var fname = where.name;
    var fn = jsonPath.eval(opts.context, fname);
    return fn[0];
}

function prepareArgs(row, where) {
    var args = [];
    _.each(where.args, function(arg) {
        if(arg.type === 'column') {
            args.push(arg.alias ? row[arg.alias] : row[arg.index]);
        }
        else {
            args.push(arg.value)
        }
    });
    return args;
}
