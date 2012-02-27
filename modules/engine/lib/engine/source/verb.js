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

var assert = require('assert'),
    _ = require('underscore'),
    async = require('async'),
    MutableURI = require('ql.io-mutable-uri'),
    strTemplate = require('../peg/str-template.js'),
    uriTemplate = require('ql.io-uri-template'),
    fs = require('fs'),
    normalize = require('path').normalize,
    request = require('../http/request.js'),
    _util = require('../util.js');

var Verb = module.exports = function(statement, type, bag, path) {
    this.type = type;
    this.__proto__ = statement;

    // Default patches
    this['validate param'] = function() {
        return true;
    };
    this['patch uri'] = function(args) { return args.uri; };
    this['udf'] = function() {};
    this['patch headers'] = function(args) { return args.headers; };
    this['body template'] = function() {};
    this['patch body'] = function(args) { return { content: args.body}; };
    this['parse response'] = function() {};
    this['patch response'] = function(args) {return args.body; };
    this['patch mediaType'] = function(args) { return args.headers['content-type']};
    this['patch status'] = function(args) { return args.status; };

    // May override patches
    _process(this, statement, bag, path);

    this.validateParams = function(params, statement) {
        var validator = this['validate param'];
        if(validator) {
            assert.ok(_.isFunction(validator), 'Validator is not a function');
            var name, value, isValid;
            for(name in params) {
                if(name === 'config') continue;
                value = params[name];
                isValid = validator({
                    statement: statement,
                    params: params
                }, name, value);
                if(!isValid) {
                    throw 'Value of ' + name + ' "' + value + '" is not valid';
                }
            }
        }
    };

    this.invokeUdf = function(statement, resource, holder) {
        var self = this;
        _.each(statement.whereCriteria, function (c) {
            if(c.operator === 'udf') {
                var funcs = self.udf();
                if(funcs[c.name]) {
                    holder[c.name] = funcs[c.name].apply(self, c.args.value);
                }
                else {
                    throw {
                        message: 'udf ' + c.name + ' not defined'
                    };
                }
            }
        });
    };

    this.uris = function(args, params) {
        // Parse the uri template (hits a cache)
        var template, self = this;
        try {
            template = uriTemplate.parse(statement.uri);
            statement.merge = template.merge();
        }
        catch(err) {
            args.logEmitter.emitWarning(err);
            return args.callback(err, null);
        }

        // Format the URI. This may return multiple to accommodate single valued tokens with
        // multiple values
        var uris = template.format(params, statement.defaults);
        uris = _.isArray(uris) ? uris : [uris];

        // Monkey patch
        var temp = [];
        _.each(uris, function (u) {
            var parsed = new MutableURI(u);
            var patched = self['patch uri']({
                uri: parsed,
                statement: args.statement,
                params: params
            });

            if(patched) {
                if(_.isArray(patched)) {
                    var arr = [];
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
        return temp;
    };

    this.patchHeaders = function(uri, params, headers) {
        var parsed = new MutableURI(uri);
        var ret = this['patch headers']({
            uri: parsed,
            statement: this,
            params: params,
            headers: headers
        });
        return ret || {};
    };

    this.bodyTemplate = function(uri, params, headers) {
       var parsed;
        parsed = new MutableURI(uri);
        var ret = this['body template']({
            uri: parsed,
            statement: this,
            params: params,
            headers: headers
        });
        return ret || {};
    };

    this.patchBody = function(uri, params, headers, body) {
        var parsed = new MutableURI(uri);
        var ret = this['patch body']({
            uri: parsed,
            statement: this,
            params: params,
            body: body,
            headers: headers
        });
        return ret;
    };

    // TODO: Repeated URI parsing!
    this.parseResponse = function(uri, params, headers, body) {
        var parsed = new MutableURI(uri);
        var ret = this['parse response']({
            uri: parsed,
            statement: this,
            params: params,
            body: body,
            headers: headers
        });
        return ret;
    };

    this.patchResponse = function(uri, params, status, headers, body) {
        var parsed = new MutableURI(uri);
        return this['patch response']({
            uri: parsed,
            statement: this,
            params: params,
            status: status,
            headers: headers,
            body: body
        });
    };

    this.patchMediaType = function(uri, params, status, headers, body) {
        var parsed = new MutableURI(uri);
        return this['patch mediaType']({
            uri: parsed,
            statement: statement,
            params: params,
            status: status,
            headers: headers,
            body: body
        });
    };

    this.patchStatus = function(resourceUri, params, status, headers, respData) {
        return this['patch status']({
                uri: resourceUri,
                statement: statement,
                params: params,
                status: status,
                headers: headers,
                body: respData
            }) || res.statusCode;
    }

    this.exec = function(args) {
        var self = this, holder = {};

        //
        // The order of args here defines how params get overridden.
        // Changing the order can break compatibility with existing apps. So don't change.
        var params = _util.prepareParams(args.context,
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
            args.resource.validateParams(params, args.statement);
        }
        catch(e) {
            return args.callback(e);
        }

        // Invoke UDFs - defined by monkey patch
        try {
            args.resource.invokeUdf(args.statement, args.resource, params);
        }
        catch(e) {
            return args.callback(e.stack || e);
        }

        var resourceUri;
        try {
            resourceUri = args.resource.uris(args, params);
        }
        catch(e) {
            return args.callback(e);
        }

        // If there are no URIs, just return now
        if(!resourceUri || resourceUri.length === 0) {
            return args.callback(undefined, {});
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
                        // TODO: merge rem and holder into one
                        send(self, args, resourceUri[0], rem, holder, function (e, r) {
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
                        send(self, args, uri, params, holder, function (e, r) {
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
                        ret.body = mergeArray(results, 'body', (args.resource.body && args.resource.body.foreach) ? 'block' : args.resource.merge);
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
};

//
// Monkey patch methods - default no-ops
//

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

function _process(self, statement, bag, root) {
    var template, param, compiled;
    self.params = [];
    if(statement.uri) {
        try {
            // Look for '{' and '}
            compiled = strTemplate.parse(statement.uri);
            statement.uri = compiled.format(bag, true);
        }
        catch(e) {
            // Continue as we can treat non-templates as usual
        }
        // self
        self.uri = statement.uri;
        self.method = statement.method.toLowerCase();

        template = uriTemplate.parse(statement.uri);

        _.each(template.stream, function(token) {
            if(token && token.variable) {
                param = cloneDeep(token);
                // Don't worry - there is an intentional typo here
                param.defautl = statement.defaults ? statement.defaults[token.variable] : undefined;
                self.params.push(param);
            }
        });
    }
    if(statement.headers) {
        _.each(statement.headers, function(v, n) {
            try {
                var compiled = strTemplate.parse(v);

                // Keep non-matching tokens here so that they can be replaced at engine.exec time.
                statement.headers[n] = compiled.format(bag, true);
            }
            catch(e) {
                // Ignore as we want to treat non-conformat strings as opaque
            }
        });
    }
    if(statement.defaults) {
        _.each(statement.defaults, function(v, n) {
            try {
                var compiled = strTemplate.parse(v);

                // Keep non-matching tokens here so that they can be replaced at engine.exec time.
                statement.defaults[n] = compiled.format(bag, true);
            }
            catch(e) {
                // Ignore as we want to treat non-conformat strings as opaque
            }
        });
    }
    if(statement.body) {
        // Load the file
        statement.body.content = fs.readFileSync(normalize(root + statement.body.template), 'utf8');
        self.body = cloneDeep(statement.body);
    }
    if(statement.patch) {
        var path = root + statement.patch;

        // Monkey patch is the compiled patch module
        var patch = require(path);
        _.each(patch, function(v, k) {
            self[k] = v;
        });
    }
    if(statement.auth) {
        // auth is the compiled auth module
        try {
            self.auth = require(statement.auth);
        }
        catch(e) {
            // Not found in a module path. Try current dir
            path = root + statement.auth;
            self.auth = require(path);
        }
    }
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

function send(verb, args, uri, params, holder, callback) {
    // Authenticate the request
    if(verb.auth) {
        verb.auth.auth(params, args.config, function (err) {
            if(err) {
                return cb(err);
            }
        });
    }

    request.send(args, uri, params, holder, callback);
}
