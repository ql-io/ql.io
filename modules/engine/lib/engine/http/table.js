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
    markdown = require('markdown'),
    MutableURI = require('ql.io-mutable-uri'),
    strTemplate = require('../peg/str-template.js'),
    uriTemplate = require('ql.io-uri-template'),
    fs = require('fs'),
    normalize = require('path').normalize,
    request = require('./request.js'),
    _util = require('../util.js');

var Table = module.exports = function(opts, comments, statement) {
    this.statement = statement;
    this.name = statement.name;
    this.opts = opts;
    this.verbs = {};
    var bag = {
        config: opts.config
    };

    // Metadata for describe
    this.meta = {
        name: this.statement.name,
        routes: [],
        comments: ''
    };
    var self = this;
    if(comments.length > 0) {
        _.each(comments, function(comment) {
            self.meta.comments += markdown.markdown.toHTML(comment);
        });
    }

    _.each(['select', 'insert', 'update', 'delete'], function(type) {
        if(self.statement[type]) {
            try {
                var verb = new Verb(self.statement[type], type, bag, self.opts.path);
                self.verbs[type] = verb;
            }
            catch(e) {

                self.opts.logEmitter.emitError(e.message || e);
                return self.opts.cb(e);
            }
        }
    });
};

Table.prototype.verb = function(type) {
    return this.verbs[type];
};

var Verb = function(statement, type, bag, path) {
    this.type = type;
    this.__proto__ = statement;

    // Default patches
    this['validate param'] = function() {
        return true;
    };
    this['patch uris'] = function() {};
    this['udf'] = function() {};
    this['patch headers'] = function() {};
    this['body template'] = function() {};
    this['patch body'] = function() {};
    this['parse response'] = function() {};
    this['patch response'] = function() {};
    this['patch mediaType'] = function() {};
    this['patch status'] = function() {};

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

    this.exec = function(args) {
        var holder = {};

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
        statement.monkeyPatch = require(path);

        // Merge the patch functions
        _.each(statement.monkeyPatch, function(v, k) {
            self[k] = v;
        });
    }
    if(statement.auth) {
        // auth is the compiled auth module
        statement.auth = require(statement.auth);
    }

    statement.uris = function(args, params) {
        // Parse the uri template (hits a cache)
        var template;
        try {
            template = uriTemplate.parse(statement.uri);
            statement.merge = template.merge();
        }
        catch(err) {
            args.logEmitter.emitWarning(err);
            return args.callback(err, null);
        }

        // Format the URI. If a token is single valued, but we have multiple values in the params array,
        // formatUri return multiple values.
        var uris = template.format(params, statement.defaults);
        uris = _.isArray(uris) ? uris : [uris];

        // Monkey patch
            uris = patchUris(statement, uris, args.statement, params);
        return uris;
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
