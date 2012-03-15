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
    os = require('os'),
    _ = require('underscore'),
    headers = require('headers'),
    async = require('async'),
    MutableURI = require('ql.io-mutable-uri'),
    strTemplate = require('../peg/str-template.js'),
    uriTemplate = require('ql.io-uri-template'),
    fs = require('fs'),
    normalize = require('path').normalize,
    request = require('../http/request.js'),
    _util = require('../util.js');

var Verb = module.exports = function(table, statement, type, bag, path) {
    this.table = table;
    this.type = type;
    this.__proto__ = statement;
    this.cacheDuration = statement.cache.duration;

    // Default patches
    this['validate param'] = function() {
        return true;
    };
    this['patch uri'] = function(args) { return args.uri; };
    this['udf'] = function() {};
    this['patch headers'] = function(args) { return args.headers; };
    this['body template'] = function() {};
    this['patch body'] = function(args) { return args.body; };
    this['compute key'] = function(args) {
        if(this.cacheDuration){
            //table, method, uri, params, headers, body
            var key = [];
            key.push(args.table);
            key.push(args.uri);
            key.push(JSON.stringify(args.params));
            key.push(JSON.stringify(_.chain(args.headers)
                .keys()
                .without("connection","user-agent","accept","accept-encoding","request-id")
                .reduce(function(obj,header){
                    obj[header] = args.headers[header];
                    return obj;
                },{})
                .value()));
            return(key.join(':'));
        }
    };
    this['parse response'] = function(args) { // Just append bufs to a string
        var encoding = 'UTF-8';
        if(args.headers['content-type']) {
            var contentType = headers.parse('content-type', args.headers['content-type'] || '');
            encoding = contentType.params.charset ? contentType.params.charset :
                contentType.subtype === 'csv' ? 'ASCII' : 'UTF-8';
        }
        var str = '';
        _.each(args.body, function(buf) {
            str += buf.toString(encoding);
        });
        return {
            content: str
        };
    };
    this['patch response'] = function(args) {return args.body; };
    this['patch mediaType'] = function(args) { return args.headers['content-type']};
    this['patch status'] = function(args) { return args.status; };

    // May override patches
    _process(this, statement, bag, path);

    //
    // TODO: Negative tests needed - Assert return types of all monkey patch methods
    //
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
        return this['patch headers']({
            uri: uri,
            statement: this,
            params: params,
            headers: headers
        }) || {};
    };

    this.tmpl = function(uri, params, headers, serializers) {
        var self = this;
        var body = this['body template']({
            uri: uri,
            statement: this,
            params: params,
            headers: headers
        }) || {};

        var content = body.content || this.body.content;
        var type = body.type || this.body.type;
        var payload =  {
            content: undefined,
            type: type
        };

        if(content && content.length > 0) {
            var serializer = _.find(serializers, function(serializer) {
                return serializer.accepts(type, self.body.template, content);
            });
            payload.content = serializer.serialize(self.body.type, content, self, params, self.defaults);
        }

        var ret = this.patchBody(uri, params, headers, payload) || payload;
        return ret;

    };

    this.patchBody = function(uri, params, headers, body) {
        return this['patch body']({
            uri: uri,
            statement: this,
            params: params,
            body: body,
            headers: headers
        });
    };

    this.computeKey = function(table, method, uri, params, headers, body){
        return this['compute key']({
            table: table,
            method: method,
            uri: uri,
            params: params,
            body: body,
            headers: headers
        });
    }

    // TODO: Repeated URI parsing!
    this.parseResponse = function(uri, params, headers, body) {
        return this['parse response']({
            uri: uri,
            statement: this,
            params: params,
            body: body,
            headers: headers
        });
    };

    this.patchResponse = function(uri, params, status, headers, body) {
        return this['patch response']({
            uri: uri,
            statement: this,
            params: params,
            status: status,
            headers: headers,
            body: body
        });
    };

    this.patchMediaType = function(uri, params, status, headers, body) {
        return this['patch mediaType']({
            uri: uri,
            statement: statement,
            params: params,
            status: status,
            headers: headers,
            body: body
        });
    };

    this.patchStatus = function(uri, params, status, headers, respData) {
        return this['patch status']({
            uri: uri,
            statement: statement,
            params: params,
            status: status,
            headers: headers,
            body: respData
        }) || res.statusCode;
    };

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
            return args.callback(undefined, {
                headers: {
                    'content-type': 'application/json'
                },
                body: {}
            });
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
                        send(self, args, resourceUri[0], rem, function (e, r) {
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
                        send(self, args, uri, params, function (e, r) {
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

function send(verb, args, uri, params, callback) {
    // Authenticate the request
    if(verb.auth) {
        verb.auth.auth(params, args.config, function (err) {
            if(err) {
                return cb(err);
            }
        });
    }

    // Mint a tx for logging and consistent callback handling
    var httpReqTx = args.logEmitter.wrapEvent(args.parentEvent, 'QlIoHttpRequest', null, callback);

    // Parse - used by downstream patches
    var parsed = new MutableURI(uri);

    // Headers
    var headers = {
        'connection' : args.settings['connection'] ? args.settings['connection'] : 'keep-alive',
        'user-agent' : 'ql.io-engine' + require('../../../package.json').version + '/node.js-' + process.version,
        'accept' : _.pluck(args.xformers, 'accept').join(','),
        'accept-encoding' : 'gzip, deflate'
    };

    // Copy headers from the table def
    _.each(args.resource.headers, function(v, k) {
        var compiled;
        try {
            compiled = strTemplate.parse(v);
            v = compiled.format(params);
        }
        catch(e) {
            // Ignore as we want to treat non-conformant strings as opaque
            args.logEmitter.emitWarning(httpReqTx.event, 'unable to parse header ' + v + ' error: ' + e.stack || e);
        }
        headers[k.toLowerCase()] = v;
    });

    var name = args.settings['request-id'] ? args.settings['request-id'] : 'request-id';
    headers[name]  = (params['request-id'] || args.resource.headers['request-id'] ||
        httpReqTx.event.uuid) + '!ql.io' + '!' + getIp() + '[';

    // Monkey patch headers
    try {
        headers = args.resource.patchHeaders(parsed, args.params, headers);
    }
    catch(e) {
        return cb(e);
    }

    // Body
    var body;
    if(args.resource.method === 'post' || args.resource.method === 'put' || args.resource.method === 'delete' || args.resource.method === 'patch') {
        var payload = args.resource.tmpl(parsed, params, headers, args.serializers);
        body = payload.content;
        if(body) {
            headers['content-length'] = body.length;
        }
        if(!headers['content-type'] && payload.type) {
            headers['content-type'] = payload.type || verb.body.type;
        }
    }

    // Resource key to use in the cache
    var key = args.resource.computeKey(verb.table, args.resource.method || 'GET', uri, params, headers, body);

    request.send({
        table: verb.table,
        config: args.config || {},
        uri: uri,
        parsed: parsed,
        method: args.resource.method || 'GET',
        headers: headers,
        body: body,
        params: params,
        httpReqTx: httpReqTx, // TODO: clumsy
        requestId: name,
        emitter: args.emitter,
        logEmitter: args.logEmitter,
        statement: args.statement,
        resource: args.resource,
        xformers: args.xformers,
        key: key,
        cache: args.cache,
        cacheDuration: verb.cacheDuration
    });
}


function getIp() {
    var ips = _.pluck(_.filter(_.flatten(_.values(os.networkInterfaces())), function (ip) {
        return ip.internal === false && ip.family === 'IPv4';
    }), 'address');

    return ips.length > 0 ? ips[0] : '127.0.0.1';
}