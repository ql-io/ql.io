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

var strTemplate = require('./peg/str-template.js'),
    project = require('./project.js'),
    eventTypes = require('./event-types.js'),
    uriTemplate = require('ql.io-uri-template'),
    MutableURI = require('ql.io-mutable-uri'),
    http = require('http'),
    https = require('https'),
    URI = require('uri'),
    fs = require('fs'),
    assert = require('assert'),
    util = require('util'),
    _ = require('underscore'),
    mustache = require('mustache'),
    async = require('async'),
    headers = require('headers'),
    uuid = require('node-uuid'),
    os = require('os');

exports.exec = function(args) {
    var request, context, resource, statement, params, resourceUri, template, cb, holder, tasks,
        logEmitter;

    resource = args.resource;
    context = args.context;
    request = args.request; // headers and params extracted from an incoming request (if any)
    statement = args.statement;
    cb = args.callback;
    logEmitter = args.logEmitter;
    holder = {};

    // Prepare params (former ones override the later ones)
    params = prepareParams(context,
        args.params,
        request.body,
        request.routeParams,
        request.params,
        request.headers,
        resource.defaults,
        {config: args.config}
    );

    // Validate all params - make sure to wrap user code in try/catch
    try {
        validateParams(resource, params, statement);
    }
    catch(e) {
        return cb(e);
    }

    // Parse the uri template (hits a cache)
    resourceUri = resource.uri;
    try {
        template = uriTemplate.parse(resourceUri);
    }
    catch(err) {
        logEmitter.emitWarning(err);
        return cb(err, null);
    }

    // Format the URI. If a token is single valued, but we have multiple values in the params array,
    // this returns multiple values so that we can split the job.
    resourceUri = formatUri(template, params, resource.defaults);

    // Monkey patch URIs - useful if there is a mismatch between statements and URIs
    try {
        resourceUri = patchUris(resource, resourceUri, statement, params);
    }
    catch(e) {
        return cb(e);
    }
    // If there are no URIs, just return now
    if(!resourceUri || resourceUri.length === 0) {
        return cb(undefined, {});
    }

    // Invoke UDFs - defined by monkey patch
    try {
        invokeUdf(statement, resource, holder);
    }
    catch(e) {
        return cb(e.stack || e);
    }

    // if template.format() returns multiple URIs, we need to execute all of them in parallel,
    // join on the response, and then send the response to the caller.
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
        // In the case of scatter-gather, ignore errors and process the rest.
        if(err && resourceUri.length === 1) {
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
                    ret.body = mergeArray(results, 'body', template.merge());
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
                return cb(undefined, ret);
            }
            else {
                return cb(err, results);
            }
        }
    });
}

function sendOneRequest(args, resourceUri, params, holder, cb) {
    var h, requestBody, client, isTls, options, template;
    var uri, heirpart, authority, host, port, path, useProxy = false, proxyHost, proxyPort;

    var httpReqTx = args.logEmitter.wrapEvent(args.parentEvent, 'QlIoHttpRequest', null, cb);
    var resource = args.resource;
    var statement = args.statement;
    var settings = args.settings || {};
    var config = args.config || {};
    var emitter = args.emitter;
    var logEmitter = args.logEmitter;

    var conn = settings['connection'] ? settings['connection'] : 'keep-alive';
    h = {
        'connection' : conn
    };

    var requestId = {
        name : settings['request-id'] ? settings['request-id'] : 'request-id',
        value : params['request-id'] || resource.headers['request-id'] || httpReqTx.event.uuid
    };

    h[requestId.name]  = requestId.value;
    h['user-agent'] = 'ql.io/node.js ' + process.version;

    // Clone headers - also replace any tokens
    _.each(resource.headers, function(v, k) {
        var compiled;
        try {
            compiled = strTemplate.parse(v);
            v = compiled.format(params);
        }
        catch(e) {
            // Ignore as we want to treat non-conformant strings as opaque
            logEmitter.emitWarning(httpReqTx.event, 'unable to parse header ' + v + ' error: ' + e.stack || e);
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
        resource.auth.auth(params, config, function(err, ack) {
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
                logEmitter.emitWarning(err);
                return cb(err, null);
            }
            requestBody = formatUri(template, params, resource.defaults);
            assert.ok(requestBody.length === 1, 'Body template processing resulted in an array. INTERNAL ERROR');
            requestBody = requestBody[0];
        }
        else {
            holder.statement = statement;
            holder.params = params;

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

    // Now try to get a representation of the resource
    isTls = resourceUri.indexOf('https://') == 0;
    uri = new URI(resourceUri, false);

    heirpart = uri.heirpart();
    assert.ok(heirpart, 'URI [' + resourceUri + '] is invalid');
    authority = heirpart.authority();
    assert.ok(authority, 'URI [' + resourceUri + '] is invalid');
    host = authority.host();
    assert.ok(host, 'Host of URI [' + resourceUri + '] is invalid');
    port = authority.port() || (isTls ? 443 : 80);
    assert.ok(port, 'Port of URI [' + resourceUri + '] is invalid');
    path = (heirpart.path().value || '') + (uri.querystring() || '');

    if(config.proxy) {
        var proxyConfig = config.proxy;
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

    // Send
    sendMessage(client, emitter, logEmitter, statement, httpReqTx, options, resourceUri, requestBody, h,
        requestId,  resource, args.xformers, 0);
}

function sendMessage(client, emitter, logEmitter, statement, httpReqTx, options, resourceUri, requestBody, h,
                     requestId, resource, xformers, retry) {
    var status, clientRequest, start = Date.now(), mediaType, respData, uri;

    if(emitter) {
        var uniqueId = uuid();
        var packet = {
            line: statement.line,
            id: uniqueId,
            uuid: httpReqTx.event.uuid,
            method: options.method,
            uri: resourceUri,
            headers: [],
            start: toISO(new Date()),
            type: eventTypes.STATEMENT_REQUEST
        };
        if(requestBody) {
            packet.body = requestBody;
        }
        _.each(h, function(v, n) {
            packet.headers.push({
                name: n,
                value: v
            });
        });
        emitter.emit(packet.type, packet);
    }

    clientRequest = client.request(options, function(res) {
        setEncoding(res);
        respData = '';
        res.on('data', function (chunk) {
            respData += chunk;
        });
        res.on('end', function() {

            if(emitter) {
                var packet = {
                    line: statement.line,
                    uuid: httpReqTx.event.uuid,
                    id: uniqueId,
                    status: res.statusCode,
                    headers: [],
                    time: new Date() - start,
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

                if(res.headers[requestId.name]) {
                    emitter.emit(eventTypes.REQUEST_ID_RECEIVED, res.headers[requestId.name]);
                }
                else {
                    // Send back the uuid created in ql.io, if the underlying api
                    // doesn't support the request tracing or the table is not configured with
                    // the right name of the header.
                    emitter.emit(eventTypes.REQUEST_ID_RECEIVED, h[requestId.name]);
                }
            }

            // TODO: Handle redirects

            mediaType = sniffMediaType(mediaType, resource, statement, res, respData);

            logEmitter.emitEvent(httpReqTx.event, resourceUri + '  ' +
                util.inspect(options) + ' ' +
                res.statusCode + ' ' + mediaType.type + '/' + mediaType.subtype + ' ' +
                util.inspect(res.headers) + ' ' + (Date.now() - start) + 'msec');

            // Parse
            jsonify(respData, mediaType, xformers, function(respJson) {
                try {
                    status = getStatus(res, resource, respJson, respData);
                }
                catch(e) {
                    return httpReqTx.cb(e);
                }

                if(status >= 200 && status <= 300) {
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
            }, function(error) {
                error.body = respData;
                return httpReqTx.cb(error);
            });
        });
    });

    if(requestBody) {
        clientRequest.write(requestBody);
    }
    clientRequest.on('error', function(err) {
        logEmitter.emitError(httpReqTx.event, 'error with uri - ' + resourceUri + ' - ' +
            err.message + ' ' + (Date.now() - start) + 'msec');
        // For select, retry once on network error
        if(retry === 0 && statement.type === 'select') {
            logEmitter.emitEvent(httpReqTx.event, 'retrying - ' + resourceUri + ' - ' + (Date.now() - start) + 'msec');
            sendMessage(client, emitter, logEmitter, statement, httpReqTx, options, resourceUri, requestBody, h,
                    requestId,  resource, xformers, 1);
        }
        else {
            err.uri = uri;
            err.status = 502;
            return httpReqTx.cb(err);
        }
    });
    clientRequest.end();
}

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
                if(params.hasOwnProperty(name)) {
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

function setEncoding(res){
    var contentType = headers.parse('content-type', res.headers['content-type'] || '');
    var encoding = contentType.subtype === 'csv' ? 'ascii' : 'utf8';

    if(contentType.params && contentType.params.charset){
        encoding = contentType.params.charset == 'us-ascii' ? 'ascii' : 'utf8';
    }
    res.setEncoding(encoding);
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


function jsonify(respData, mediaType, xformers, respCb, errorCb) {

    if (!respData || /^\s*$/.test(respData)) {
        respCb({});
    }
    else if(mediaType.subtype === 'xml') {
        xformers['xml'].toJson(respData, respCb, errorCb);
    }
    else if(mediaType.subtype === 'json') {
        xformers['json'].toJson(respData, respCb, errorCb);
    }
    else if(mediaType.subtype === 'csv') {
        xformers['csv'].toJson(respData, respCb, errorCb,
            (mediaType.params && mediaType.params.header != undefined));
    }
    else if(mediaType.type === 'text') {
        // Try JSON first
        xformers['json'].toJson(respData, respCb, function(error) {
            // if error Try XML
            xformers['xml'].toJson(respData, respCb, errorCb);
        });
    }
}

function getStatus(res, resource, respJson, respData) {
    var overrideStatus = res.statusCode;
    if(resource.monkeyPatch && resource.monkeyPatch['patch status']) {
        overrideStatus = resource.monkeyPatch['patch status']({
            status: res.statusCode,
            headers: res.headers,
            body: respJson || respData
        })
    }
    return overrideStatus;
}

function ip() {
    // TODO Change the implementation to return the IP Address using
    // os.getNetworkInterfaces() call once we upgrade to node 0.5.5.
    // For testing purposes host name is returned.
    return os.hostname();
}

function mergeArray(uarr, prop, merge) {
    // Remove undefineds.
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

function pad(n) {
    return n < 10 ? '0' + n : n
}

function toISO(d) {
    return d.getUTCFullYear() + '-'
        + pad(d.getUTCMonth() + 1) + '-'
        + pad(d.getUTCDate()) + 'T'
        + pad(d.getUTCHours()) + ':'
        + pad(d.getUTCMinutes()) + ':'
        + pad(d.getUTCSeconds()) + 'Z';
}