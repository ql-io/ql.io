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

var assert = require('assert'),
    _ = require('underscore'),
    async = require('async'),
    MutableURI = require('ql.io-mutable-uri'),
    uriTemplate = require('ql.io-uri-template'),
    request = require('./request.js');

exports.exec = function(args) {
    var logEmitter = args.logEmitter;
    var holder = {};

    //
    // The order of args here defines how params get overridden.
    // Changing the order can break compatibility with existing apps. So don't change.
    var params = prepareParams(args.context,
        args.params,
        args.request.body,
        args.request.routeParams,
        args.request.params,
        args.request.headers,
        args.request.connection,
        args.resource.defaults,
        {config: args.config}
    );

    // Validate each param if the monkey patch has a 'validate param' validator.
    try {
        validateParams(args.resource, params, args.statement);
    }
    catch(e) {
        return args.callback(e);
    }

    // Parse the uri template (hits a cache)
    var template;
    try {
        template = uriTemplate.parse(args.resource.uri);
    }
    catch(err) {
        logEmitter.emitWarning(err);
        return args.callback(err, null);
    }

    // Format the URI. If a token is single valued, but we have multiple values in the params array,
    // formatUri return multiple values.
    var resourceUri = formatUri(template, params, args.resource.defaults);

    // Monkey patch URIs
    try {
        resourceUri = patchUris(args.resource, resourceUri, args.statement, params);
    }
    catch(e) {
        return args.callback(e);
    }
    // If there are no URIs, just return now
    if(!resourceUri || resourceUri.length === 0) {
        return args.callback(undefined, {});
    }

    // Invoke UDFs - defined by monkey patch
    try {
        invokeUdf(args.statement, args.resource, holder);
    }
    catch(e) {
        return args.callback(e.stack || e);
    }

    // if template.format() returns multiple URIs, we need to execute all of them in parallel,
    // join on the response, and then send the response to the caller.
    var tasks = [];

    // Split post requests
    // TODO: need to consider body template patch here.
    if(args.resource.body && args.resource.body.foreach) {
        _.each(params[args.resource.body.foreach], function (param) {
            tasks.push(function (param) {
                return function (callback) {
                    var rem = {};
                    for(var p in params) {
                        if(p!= args.resource.body.foreach) {
                            rem[p] = params[p];
                        }
                    }
                    rem[args.resource.body.foreach] = param;
                    request.send(args, resourceUri[0], rem, holder, function (e, r) {
                        callback(e, r);
                    });
                }
            }(param));
        });
    }
    else {
        _.each(resourceUri, function (uri) {
            tasks.push(function (uri) {
                return function (callback) {
                    request.send(args, uri, params, holder, function (e, r) {
                        callback(e, r);
                    });
                }
            }(uri));
        });
    }

    async.parallel(tasks, function(err, results) {
        // In the case of scatter-gather, ignore errors and process the rest.
        if(err && resourceUri.length === 1) {
            return args.callback(err, results);
        }
        else {
            // Assume that they all share the same media type
            var ret = {
                headers: {
                    'content-type':  'application/json'
                },
                body: []
            };
            if(_.isArray(results)) {
                if(results.length > 1) {
                    // This happens when the request is sliced into multiple requests, with each
                    // returning a similar object.
                    //
                    // In such cases, we need to merge values of the each object in the results
                    // array. Note that merging may result in single props becoming arrays
                    ret.body = mergeArray(results, 'body', (args.resource.body && args.resource.body.foreach) ? 'block' : template.merge());
                }
                else {
                    var result = results[0];
                    if(result) {
                        ret.body = result.body;
                    }
                    else {
                        ret.body = undefined;
                    }
                }
                return args.callback(undefined, ret);
            }
            else {
                return args.callback(err, results);
            }
        }
    });
};

// Fill params from given args. In stead of merging params, simply wire up a __proto__ chain
// Risky but faster.
exports.prepareParams = prepareParams;
function prepareParams() {
    var params = {};
    var ref, arg;
    for(var i = 0; i < arguments.length; i++) {
        arg = arguments[i];
        if(arg === undefined) {
            continue;
        }
        if(ref === undefined) {
            ref = arg;
            params.__proto__ = ref;
        }
        else {
            // Delete undefined properties as an undefined will override a defined in the __proto__
            // chain
            _.each(arg, function(v, p) {
                if(v === undefined) delete arg[p];
            });
            ref.__proto__ = arg;
            ref = arg;
        }
    }
    return params;
}

function validateParams(resource, params, statement) {
    var validator;
    if(resource.monkeyPatch && resource.monkeyPatch['validate param']) {
        validator = resource.monkeyPatch['validate param'];
        if(validator) {
            assert.ok(_.isFunction(validator), 'Validator is not a function');
            var name, value, isValid;
            for(name in params) {
                value = params[name];
                isValid = validator({
                    statement: statement,
                    params: params
                }, name, value);
                if(!isValid) {
                    throw 'Value of ' + name + '"' + value + '" is not valid';
                }
            }
        }
    }
}

function patchUris(resource, resourceUri, statement, params) {
    var temp = resourceUri, parsed, patched, arr;
    if(resource.monkeyPatch && resource.monkeyPatch['patch uri']) {
        temp = [];
        _.each(resourceUri, function (u) {
            parsed = new MutableURI(u);
            patched = resource.monkeyPatch['patch uri']({
                uri: parsed,
                statement: statement,
                params: params
            });

            if(patched) {
                if(_.isArray(patched)) {
                    arr = [];
                    _.each(patched, function(p) {
                        arr.push(p.format());
                    });
                    patched = arr;
                }
                else {
                    patched = patched.format();
                }
                temp = temp.concat(patched);
            }
        });
    }

    return temp;
}

function invokeUdf(statement, resource, holder) {
    _.each(statement.whereCriteria, function (c) {
        if(c.operator === 'udf') {
            if(resource.monkeyPatch && resource.monkeyPatch['udf']) {
                holder[c.name] = resource.monkeyPatch.udf[c.name](c.args);
            }
            else {
                throw {
                    message: 'udf ' + c.name + ' not defined'
                };
            }
        }
    });
}


function formatUri(template, params, defaults) {
    var arr = template.format(params, defaults);
    return _.isArray(arr) ? arr : [arr];
}

function mergeArray(uarr, prop, merge) {
    // Remove undefined.
    var arr = _.filter(uarr, function(ele) {
        return ele;
    });
    var merged;
    if(merge === 'block') {
        merged = [];
        _.each(arr, function(source) {
            merged.push(source[prop]);
        })
    }
    else {
        if(arr.length > 0 && arr[0][prop] && _.isArray(arr[0][prop])) {
            merged = [];
        }
        else {
            merged = {};
        }
        _.each(arr, function(source) {
            source = source[prop];
            if(_.isArray(source)) {
                merged = merged.concat(source);
            }
            else {
                _.each(source, function(val, prop) {
                    if(merged[prop]) {
                        if(_.isArray(merged[prop])) {
                            if(_.isArray(val)) {
                                merged[prop] = merged[prop].concat(val)
                            }
                            else {
                                merged[prop].push(val);
                            }
                        }
                        else {
                            merged[prop] = [merged[prop]];
                            merged[prop].push(val);
                        }
                    }
                    else {
                        merged[prop] = val;
                    }
                })
            }
        });
    }
   return merged;
}

