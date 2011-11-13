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

"use strict";

var strTemplate = require('./peg/str-template.js'),
    project = require('./project.js'),
    eventTypes = require('./event-types.js'),
    logUtil = require('./log-util.js'),
    uriTemplate = require('ql.io-uri-template'),
    MutableURI = require('ql.io-mutable-uri'),
    http = require('http'),
    https = require('https'),
    URI = require('uri'),
    fs = require('fs'),
    assert = require('assert'),
    sys = require('sys'),
    _ = require('underscore'),
    expat = require('xml2json'),
    mustache = require('mustache'),
    async = require('async'),
    headers = require('headers'),
    os = require('os');

exports.exec = function(args) {
    var request, resource, statement, params, resourceUri, template, cb, holder,
        validator, parentEvent, emitter, tasks, globalOpts, merge;

    resource = args.resource;
    request = args.request; // headers and params extracted from an incoming request (if any)
    statement = args.statement;
    cb = args.callback;
    holder = {};
    emitter = args.emitter;
    globalOpts = global.opts;
    parentEvent = args.event;

    // Prepare params (the latter ones in the arg chain override the former ones)
    params = prepareParams(resource.defaults,
        request.headers,
        request.params,
        request.routeParams,
        request.body,
        args.params);

    // Validate all params
    if(resource.monkeyPatch && resource.monkeyPatch['validate param']) {
        validator = resource.monkeyPatch['validate param'];
        if(validator) {
            try {
                validateParams(statement, params, validator);
            }
            catch(e) {
                return cb(e);
            }
        }
    }

    // Parse the uri template (hits a cache)
    resourceUri = resource.uri;
    try {
        template = uriTemplate.parse(resourceUri);
    }
    catch(err) {
        global.opts.logger.warning(err);
        return cb(err, null);
    }

    // If 'block', merge en block, if not merge field by field.
    merge = template.merge();

    // Format the URI. If a token is single valued, but we have multiple values in the params array,
    // this returns multiple values so that we can split the job.
    resourceUri = formatUri(template, params, resource.defaults);

    // Preconditions - done by the monkey patch
    if(resource.monkeyPatch && resource.monkeyPatch['patch uri']) {
        var temp = [];
        try {
            _.each(resourceUri, function(u) {
                    var patched = patchUri(u, statement, params, resource.monkeyPatch['patch uri']);
                    if(patched) {
                        temp = temp.concat(patched);
                    }
            });
        }
        catch(e) {
            return cb(e);
        }
        resourceUri = temp; // Swap updated URIs
    }

    // If there are no URIs, just return now
    if(!resourceUri || resourceUri.length === 0) {
        return cb(undefined, {});
    }

    // Invoke UDFs - defined by monkey patch
    try {
        _.each(statement.whereCriteria, function(c) {
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
    catch(e) {
        return cb(e.stack || e);
    }

    // if template.format() returns multiple URIs, we need to execute all of them in parallel,
    // join on the response, and then send the response to the caller.
    // Just run them in parallel
    tasks = [];
    _.each(resourceUri, function(uri) {
        tasks.push(function(uri) {
            return function(callback) {
                sendOneRequest(args, uri, params, holder, function(e, r) {
                    callback(e, r);
                });
            }
        }(uri));
    });
    async.parallel(tasks, function(err, results) {
        if(err) {
            return cb(err, results);
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
                    ret.body = mergeArray(results, 'body', merge);
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
                return cb(err, ret);
            }
            else {
                return cb(err, results);
            }
        }
    });
}

function sendOneRequest(args, resourceUri, params, holder, cb) {
    var h, requestBody, mediaType = 'application/json', override, client, isTls, options, auth,
        clientRequest, template, start = Date.now();
    var respData, respJson, uri, heirpart, authority, host, port, path, useProxy = false, proxyHost, proxyPort;

    var httpReqTx = logUtil.wrapEvent(args.parentEvent, 'QlIoHttpRequest', null, cb);
    var resource = args.resource;
    var statement = args.statement;
    var globalOpts = global.opts;
    var emitter = args.emitter;

    var conn = (globalOpts && globalOpts['connection']) ? globalOpts['connection'] : 'keep-alive';
    h = {
        'connection' : conn
    };

    var requestId = {
        name : (globalOpts && globalOpts['request-id']) ? globalOpts['request-id'] : 'request-id',
        value : params['request-id'] || resource.headers['request-id'] || httpReqTx.event.uuid
    };

    h[requestId.name]  = requestId.value;

    // Clone headers - also replace any tokens
    _.each(resource.headers, function(v, k) {
        var compiled;
        try {
            compiled = strTemplate.parse(v);
            v = compiled.format(params);
        }
        catch(e) {
            // Ignore as we want to treat non-conformant strings as opaque
            logUtil.emitWarning(httpReqTx.event, 'unable to parse header ' + v + ' error: ' + e.stack || e);
        }
        h[k.toLowerCase()] = v;
    });

    // appending Ip address to the request id header
    h[requestId.name]  += '!ql.io' + '!' + ip() + '[';

    // Monkey patch headers
    if(resource.monkeyPatch && resource.monkeyPatch['patch headers']) {
        try {
            h = patchHeaders(resourceUri, statement, params, h, resource.monkeyPatch['patch headers']);
        }
        catch(e) {
            return cb(e);
        }
    }

    // Perform authentication
    if(resource.auth) {
        resource.auth.auth(params, function(err, ack) {
            if(err) {
                return cb(err);
            }
        });
    }

    // For POST and PUT, if there is a template, process it
    var body = {};
    if(resource.monkeyPatch && resource.monkeyPatch['body template']) {
        body = bodyTemplate(resourceUri, statement, params, h, resource.monkeyPatch['body template']);
    }
    if((resource.body || body) &&
        (resource.method === 'post' || resource.method == 'put')) {

        if(resource.body.type === 'application/x-www-form-urlencoded') {
            try {
                template = uriTemplate.parse(body.content || resource.body.content);
            }
            catch(err) {
                global.opts.logger.warning(err);
                return cb(err, null);
            }
            requestBody = formatUri(template, params, resource.defaults);
            assert.ok(requestBody.length === 1, 'Body template processing resulted in an array. INTERNAL ERROR');
            requestBody = requestBody[0];
        }
        else {
            holder.statement = statement;
            holder.params = params;
            holder.body = args.request.body; // body received as part of the original request

            requestBody = mustache.to_html(body.content || resource.body.content, holder);
        }

        if(resource.monkeyPatch && resource.monkeyPatch['patch body']) {
            body = patchBody(resourceUri, statement, params, h, requestBody, resource.monkeyPatch['patch body']);
            requestBody = body.content;
        }

        h['content-length'] = requestBody.length;
        if(!h['content-type']) {
            h['content-type'] = body.type || resource.body.type;
        }
    }

    // TODO: Validate if everything required is set
    // TODO: Remove unset params
    // TODO: Local filtering

    // Now try to get a representation of the resource
    isTls = resourceUri.indexOf('https://') == 0;
    uri = new URI(resourceUri, false);

    heirpart = uri.heirpart();
    assert.ok(heirpart, 'URI [' + resourceUri + '] is invalid')
    authority = heirpart.authority();
    assert.ok(authority, 'URI [' + resourceUri + '] is invalid')
    host = authority.host();
    assert.ok(host, 'Host of URI [' + resourceUri + '] is invalid')
    port = authority.port() || (isTls ? 443 : 80);
    assert.ok(port, 'Port of URI [' + resourceUri + '] is invalid')
    path = (heirpart.path().value || '') + (uri.querystring() || '');

    if (globalOpts && globalOpts.config && globalOpts.config.proxy) {
        var proxyConfig = globalOpts.config.proxy;
        if (proxyConfig[host] && !proxyConfig[host].host) {
            useProxy = false;
        }
        else if (proxyConfig[host] && proxyConfig[host].host) {
            proxyHost = proxyConfig[host].host;
            proxyPort = proxyConfig[host].port;
            useProxy = true;
        }
        else if (proxyConfig['*']) {
            proxyHost = proxyConfig['*'].host;
            proxyPort = proxyConfig['*'].port;
            useProxy = true;
        }
    }

    options = {
        host: useProxy ? proxyHost : host,
        port: useProxy? proxyPort : port,
        path: useProxy? uri.scheme() + '//' + host + path : path,
        method: resource.method || 'GET',
        headers: h
    };
    client = isTls ? https : http;

    // Emit
    if(emitter) {
        var packet = {
            line: statement.line,
            uuid: httpReqTx.event.uuid,
            uri: resourceUri,
            headers: [],
            body: requestBody,
            type: eventTypes.STATEMENT_REQUEST
        };
        _.each(h, function(v, n) {
            packet.headers.push({
                name: n,
                value: v
            });
        });
        emitter.emit(packet.type, packet);
    }

    clientRequest = client.request(options, function(res) {
        res.setEncoding('utf8');
        respData = '';
        res.on('data', function (chunk) {
            respData += chunk;
        });
        res.on('end', function() {

            if(emitter) {
                var packet = {
                    line: statement.line,
                    uuid: httpReqTx.event.uuid,
                    status: res.statusCode,
                    headers: [],
                    body: respData,
                    type: eventTypes.STATEMENT_RESPONSE
                };
                _.each(res.headers, function(v, n) {
                    packet.headers.push({
                        name: n,
                        value: v
                    });
                })
                emitter.emit(eventTypes.STATEMENT_RESPONSE, packet);

                if(res.headers[requestId.name])  {
                   emitter.emit(eventTypes.REQUEST_ID_RECEIVED, res.headers[requestId.name]);
                }
            }

            // TODO: Handle redirects

            mediaType = sniffMediaType(mediaType, resource, statement, res, respData);

            // TODO: Log level?
            // TODO: For now, log verbose
            logUtil.emitEvent(httpReqTx.event, resourceUri + '  ' +
                sys.inspect(options) + ' ' +
                res.statusCode + ' ' + mediaType.type + '/' + mediaType.subtype + ' ' +
                sys.inspect(res.headers) + ' ' + (Date.now() - start) + 'msec');

            // Parse
            try {
                if(mediaType.subtype === 'xml') {
                    respJson = expat.toJson(respData, {object: true});
                }
                else if(mediaType.subtype === 'json') {
                    respJson = JSON.parse(respData);
                }
                else if(mediaType.type === 'text') {
                    // Try JSON
                    try {
                        respJson = JSON.parse(respData);
                    }
                    catch(e) {
                        try {
                            respJson = expat.toJson(respData, {object: true});
                        }
                        catch(e) {
                            e.body = respData;
                            return httpReqTx.cb(e);
                        }
                    }
                }
            }
            catch(e) {
                e.body = respData;
                return httpReqTx.cb(e);
            }

            override = res.statusCode;
            if(resource.monkeyPatch && resource.monkeyPatch['patch status']) {
                try {
                    override = resource.monkeyPatch['patch status']({
                        status: res.statusCode,
                        headers: res.headers,
                        body: respJson || respData
                    })
                }
                catch(e) {
                    return httpReqTx.cb(e);
                }
            }
            if(res.statusCode >= 200 && res.statusCode <= 300) {
                if(respJson) {
                    if(resource.monkeyPatch && resource.monkeyPatch['patch response']) {
                        try {
                           respJson = resource.monkeyPatch['patch response']({
                               body: respJson
                           });
                        }
                        catch(e) {
                            return httpReqTx.cb(e);
                        }
                    }
                    // Projections
                    project.run(resource.resultSet, statement, respJson, function(filtered) {
                        return httpReqTx.cb(undefined, {
                            headers: {
                                'content-type':  'application/json'
                            },
                            body: filtered
                        });
                    });
                }
                else {

                    return httpReqTx.cb(undefined, {
                        headers: {
                            'content-type': mediaType
                        },
                        body: respData
                    });
                }
            }
            else {
                return httpReqTx.cb({
                    headers: {
                        'content-type':  respJson ? 'application/json' : mediaType
                    },
                    body: respJson || respData
                });
            }
        });
    });

    if(requestBody) {
        clientRequest.write(requestBody);
    }
    clientRequest.on('error', function(err) {
        logUtil.emitError(httpReqTx.event, 'error with uri - ' + resourceUri + ' - ' + err.message + ' ' + (Date.now() - start) + 'msec');
        err.uri = uri;
        return httpReqTx.cb(err, undefined);
    });
    clientRequest.end();
}

// Fill params from given args
exports.prepareParams = prepareParams;
function prepareParams() {
    var params = {};
    _.each(arguments, function(arg) {
        _.each(arg, function(v, p) {
            if(v) {
                params[p] = v;
            }
        });
    })
    return params;
}

function validateParams(statement, params, fn) {
    var name, value, isValid;
    assert.ok(_.isFunction(fn), 'Validator is not a function');
    for(name in params) {
        if(params.hasOwnProperty(name)) {
            value = params[name];
            isValid = fn({
                statement: statement,
                params: params
            }, name, value);
            if(!isValid) {
                throw 'Value of ' + name + '"' + value + '" is not valid';
            }
        }
    }
}

function patchUri(uri, statement, params, fn) {
    var parsed;
    parsed = new MutableURI(uri);
    var ret = fn({
        uri: parsed,
        statement: statement,
        params: params
    });

    if(ret) {
        if(_.isArray(ret)) {
            var arr = [];
            _.each(ret, function(p) {
                arr.push(p.format());
            });
            return arr;
        }
        else {
            return ret.format();
        }
    }
    else {
        return ret;
    }
}

function patchHeaders(uri, statement, params, headers, fn) {
   var parsed;
    parsed = new MutableURI(uri);
    var ret = fn({
        uri: parsed,
        statement: statement,
        params: params,
        headers: headers
    });
    ret = ret || {};
    return ret;
}

function bodyTemplate(uri, statement, params, headers, fn) {
   var parsed;
    parsed = new MutableURI(uri);
    var ret = fn({
        uri: parsed,
        statement: statement,
        params: params,
        headers: headers
    });
    assert.ok(ret, 'body template patch return undefined');
    assert.ok(ret.type, 'body template type undefined');
    assert.ok(ret.content, 'body template content undefined');
    return ret;
}

function patchBody(uri, statement, params, headers, body, fn) {
   var parsed;
    parsed = new MutableURI(uri);
    var ret = fn({
        uri: parsed,
        statement: statement,
        params: params,
        body: body,
        headers: headers
    });
    assert.ok(ret, 'body patch return undefined');
    return ret;
}

function formatUri(template, params, defaults) {
    var arr = template.format(params, defaults);
    return _.isArray(arr) ? arr : [arr];
}

function sniffMediaType(mediaType, resource, statement, res, respData) {
    // 1. If there is a patch, call it to get the media type.
    mediaType = (resource.monkeyPatch && resource.monkeyPatch['patch mediaType']  &&
        resource.monkeyPatch['patch mediaType']({
            status: res.statusCode,
            headers: res.headers,
            body: respData
        })) || res.headers['content-type'];

    // 2. If the media type is "XML", treat it as "application/xml"
    mediaType = mediaType === 'XML' ? 'application/xml' : mediaType;

    // 3. If the media type is "JSON", treat it as "application/json"
    mediaType = mediaType === 'JSON' ? 'application/json' : mediaType;

    // If none found, assume "application/json"
    mediaType = mediaType || 'application/json';

    // 4. If the media type is "text/xml", treat it as "application/xml"
    mediaType = (mediaType === 'text/xml') ? 'application/xml' : mediaType;

    return headers.parse('content-type', mediaType);
}

function ip() {
    // TODO Change the implementation to return the IP Address using
    // os.getNetworkInterfaces() call once we upgrade to node 0.5.5.
    // For testing purposes host name is returned.
    return os.hostname();
}

function mergeArray(arr, prop, merge) {
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