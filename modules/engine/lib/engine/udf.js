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
    jsonfill = require('./jsonfill.js'),
    _util = require('./util.js'),
    _ = require('underscore');

exports.resolve = function(opts, udf) {
    var fn = resolveUdf(opts, udf);
    if(fn) {
        var args = prepareArgs(opts, udf);
        return function(dataset, index, row, cb) {
            var wrapper = {
                rows: dataset,
                row : row,
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

function prepareArgs(opts, where) {
    var args = [];

    var params = _util.prepareParams(opts.context,
        opts.request.body,
        opts.request.routeParams,
        opts.request.params,
        opts.request.headers,
        opts.request.connection,
        {config: opts.config});

    _.each(where.args, function(arg) {
            args.push(jsonfill.lookup(arg.value, params));
    });
    return args;
}
