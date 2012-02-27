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

var _ = require('underscore'),
    uriTemplate = require('ql.io-uri-template'),
    os = require('os'),
    MutableURI = require('ql.io-mutable-uri'),
    assert = require('assert'),
    strTemplate = require('../peg/str-template.js'),
    project = require('../project.js'),
    eventTypes = require('../event-types.js'),
    headers = require('headers'),
    http = require('http'),
    https = require('https'),
    URI = require('uri'),
    util = require('util'),
    ejs = require('ejs'),
    mustache = require('mustache'),
    uuid = require('node-uuid');

exports.send = function(args, resourceUri, params, holder, cb) {

    var requestBody, client, options, template;
    var uri, heirpart, authority, host, port, path, useProxy = false, proxyHost, proxyPort;

    var httpReqTx = args.logEmitter.wrapEvent(args.parentEvent, 'QlIoHttpRequest', null, cb);

    var config = args.config || {};

     // Prep headers
     var headers = {
        'connection' : args.settings['connection'] ? args.settings['connection'] : 'keep-alive',
        'user-agent' : 'ql.io-engine' + require('../../../package.json').version + '/node.js-' + process.version,
        'accept' : _.pluck(args.xformers, 'accept').join(',')
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

    var requestId = {
        name : args.settings['request-id'] ? args.settings['request-id'] : 'request-id',
        value : (params['request-id'] || args.resource.headers['request-id'] || httpReqTx.event.uuid) + '!ql.io' + '!' + getIp() + '['
    };

    headers[requestId.name]  = requestId.value;

    // Monkey patch headers
    try {
        headers = args.resource.patchHeaders(resourceUri, args.prams, headers);
    }
    catch(e) {
        return cb(e);
    }

    // Request body
    var body = {};
    if(args.resource.monkeyPatch && args.resource.monkeyPatch['body template']) {
        body = bodyTemplate(resourceUri, args.statement, params, headers, args.resource.monkeyPatch['body template']);
    }
    var content = body.content || args.resource.body.content;
    if(content && content.length > 0 &&
        (args.resource.method === 'post' || args.resource.method == 'put')) {

        if(args.resource.body.type === 'application/x-www-form-urlencoded') {
            try {
                template = uriTemplate.parse(content);
            }
            catch(err) {
                args.logEmitter.emitWarning(err);
                return cb(err, null);
            }
            var arr = template.format(params, args.resource.defaults);
            requestBody = _.isArray(arr) ? arr : [arr];

            assert.ok(requestBody.length === 1, 'Body template processing resulted in an array. INTERNAL ERROR');
            requestBody = requestBody[0];
        }
        else {
            holder.statement = args.statement;
            holder.params = params;

            if(args.resource.body.template && args.resource.body.template.match(/\.ejs/)) {
                // Use EJS
                requestBody = ejs.render(content, holder);
            }
            else {
                // Use Mustache
                requestBody = mustache.to_html(content, holder);
            }
        }

        if(args.resource.monkeyPatch && args.resource.monkeyPatch['patch body']) {
            body = patchBody(resourceUri, args.statement, params, headers, requestBody, args.resource.monkeyPatch['patch body']);
            requestBody = body.content;
        }

        headers['content-length'] = requestBody.length;
        if(!headers['content-type']) {
            headers['content-type'] = body.type || args.resource.body.type;
        }
    }

    //
    // Send
    //
    var isTls = resourceUri.indexOf('https://') == 0;
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
        method: args.resource.method || 'GET',
        headers: headers
    };
    client = isTls ? https : http;

    // Send
    sendMessage(config, client, args.emitter, args.logEmitter, args.statement, params, httpReqTx, options, resourceUri, requestBody, headers,
        requestId,  args.resource, args.xformers, 0);
}

function sendMessage(config, client, emitter, logEmitter, statement, params, httpReqTx, options, resourceUri, requestBody, h,
                     requestId, resource, xformers, retry) {
    var status, clientRequest, start = Date.now(), mediaType, respData, uri;
    var reqStart = Date.now();
    var timings = {
        "blocked": -1,
        "dns": -1,
        "connect": -1,
        "send": -1,
        "wait": -1,
        "receive": -1
    };

    if(emitter) {
        var uniqueId = uuid();
        var packet = {
            line: statement.line,
            id: uniqueId,
            uuid: httpReqTx.event.uuid,
            method: options.method,
            uri: resourceUri,
            headers: [],
            body: requestBody,
            start: reqStart,
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
        var responseLength = 0;
        res.on('data', function (chunk) {
            responseLength += chunk.length;

            var maxResponseLength = getMaxResponseLength(config, logEmitter);

            if (responseLength > maxResponseLength) {
                var err = new Error('Response length exceeds limit');
                err.uri = resourceUri;
                err.status = 502;

                logEmitter.emitError(httpReqTx.event, 'error with uri - ' + resourceUri + ' - ' +
                    'response length ' + responseLength + ' exceeds config.maxResponseLength of ' + maxResponseLength +
                    ' ' + (Date.now() - start) + 'msec');
                res.socket.destroy();
                return httpReqTx.cb(err);
            }
            respData += chunk;

        });
        res.on('end', function() {
            timings.receive = Date.now() - reqStart;
            if(emitter) {
                var packet = {
                    line: statement.line,
                    uuid: httpReqTx.event.uuid,
                    id: uniqueId,
                    status: res.statusCode,
                    statusText: http.STATUS_CODES[res.statusCode],
                    headers: [],
                    time: new Date() - start,
                    body: respData,
                    type: eventTypes.STATEMENT_RESPONSE,
                    timings: timings
                };
                _.each(res.headers, function(v, n) {
                    packet.headers.push({
                        name: n,
                        value: v
                    });
                });
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

	        // Transform (patch only)
            if(resource.monkeyPatch && resource.monkeyPatch['parse response']) {
                try {
                    var result = resource.monkeyPatch['parse response']({
                        body: respData,
                        headers: res.headers
                    });

                    respData = result.body;
                    res.headers = result.headers;
                }
                catch(e) {
                    return httpReqTx.cb(e);
                }
            }

            mediaType = sniffMediaType(mediaType, resourceUri, resource, statement, res, respData);

            logEmitter.emitEvent(httpReqTx.event, resourceUri + '  ' +
                util.inspect(options) + ' ' +
                res.statusCode + ' ' + mediaType.type + '/' + mediaType.subtype + ' ' +
                util.inspect(res.headers) + ' ' + (Date.now() - start) + 'msec');

            // Parse
            jsonify(respData, mediaType, res.headers, xformers, function(respJson) {
                try {
                    status = getStatus(resourceUri, statement, params, res, resource, respJson, respData);
                }
                catch(e) {
                    return httpReqTx.cb(e);
                }

                if(status >= 200 && status <= 300) {
                    if(respJson) {
                        if(resource.monkeyPatch && resource.monkeyPatch['patch response']) {
                            try {
                                respJson = resource.monkeyPatch['patch response']({
                                    uri: resourceUri,
                                    statement: statement,
                                    params: params,
                                    headers: res.headers,
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
        timings.send = Date.now() - reqStart;
    }
    clientRequest.on('error', function(err) {
        logEmitter.emitError(httpReqTx.event, 'error with uri - ' + resourceUri + ' - ' +
            err.message + ' ' + (Date.now() - start) + 'msec');
        // For select, retry once on network error
        if(retry === 0 && statement.type === 'select') {
            logEmitter.emitEvent(httpReqTx.event, 'retrying - ' + resourceUri + ' - ' + (Date.now() - start) + 'msec');
            sendMessage(config, client, emitter, logEmitter, statement, params, httpReqTx, options, resourceUri, requestBody, h,
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

function setEncoding(res){
    var contentType = headers.parse('content-type', res.headers['content-type'] || '');
    var encoding = contentType.subtype === 'csv' ? 'ascii' : 'utf8';

    if(contentType.subtype == 'binary') {
        encoding = 'binary';
    }

    if(contentType.params && contentType.params.charset){
        encoding = contentType.params.charset == 'us-ascii' ? 'ascii' : 'utf8';
    }
    res.setEncoding(encoding);
}


function sniffMediaType(mediaType, resourceUri, resource, statement, res, respData) {
    // 1. If there is a patch, call it to get the media type.
    mediaType = (resource.monkeyPatch && resource.monkeyPatch['patch mediaType']  &&
        resource.monkeyPatch['patch mediaType']({
            uri: resourceUri,
            statement: statement,
            params: params,
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


function jsonify(respData, mediaType, headers, xformers, respCb, errorCb) {

    if (!respData || /^\s*$/.test(respData)) {
        respCb({});
    }
    else if(mediaType.subtype === 'xml' || /\+xml$/.test(mediaType.subtype)) {
        xformers['xml'].toJson(respData, respCb, errorCb, headers);
    }
    else if(mediaType.subtype === 'json') {
        xformers['json'].toJson(respData, respCb, errorCb, headers);
    }
    else if(mediaType.subtype === 'csv') {
        xformers['csv'].toJson(respData, respCb, errorCb,
            (mediaType.params && mediaType.params.header != undefined));
    }
    else if(mediaType.type === 'text') {
        // Try JSON first
        xformers['json'].toJson(respData, respCb, function() {
            // if error Try XML
            xformers['xml'].toJson(respData, respCb, errorCb);
        });
    }
    else {
        errorCb({message:"No transformer available", type:mediaType.type, subType:mediaType.subtype})
    }
}

function getStatus(resourceUri, statement, params, res, resource, respJson, respData) {
    var overrideStatus = res.statusCode;
    if(resource.monkeyPatch && resource.monkeyPatch['patch status']) {
        overrideStatus = resource.monkeyPatch['patch status']({
            uri: resourceUri,
            statement: statement,
            params: params,
            status: res.statusCode,
            headers: res.headers,
            body: respJson || respData
        })
    }
    return overrideStatus;
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

function getMaxResponseLength(config, logEmitter) {
    if(config && config.maxResponseLength) {
        return config.maxResponseLength;
    }
    else {
        var max = 10000000; // default to 10,000,000
        logEmitter.emitWarning('config.maxResponseLength is undefined! Defaulting to ' + max);
        return max;
    }
}

function getIp() {
    var ips = _.pluck(_.filter(_.flatten(_.values(os.networkInterfaces())), function (ip) {
        return ip.internal === false && ip.family === 'IPv4';
    }), 'address');

    return ips.length > 0 ? ips[0] : '127.0.0.1';
}
