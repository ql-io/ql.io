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
    os = require('os'),
    assert = require('assert'),
    project = require('../project.js'),
    eventTypes = require('../event-types.js'),
    _headers = require('headers'),
    http = require('http'),
    https = require('https'),
    URI = require('uri'),
    util = require('util'),
    uuid = require('node-uuid');

exports.send = function(args) {

    var client, options;
    var uri, heirpart, authority, host, port, path, useProxy = false, proxyHost, proxyPort;

    var isTls = args.uri.indexOf('https://') == 0;
    uri = new URI(args.uri, false);

    heirpart = uri.heirpart();
    assert.ok(heirpart, 'URI [' + args.uri + '] is invalid');
    authority = heirpart.authority();
    assert.ok(authority, 'URI [' + args.uri  + '] is invalid');
    host = authority.host();
    assert.ok(host, 'Host of URI [' + args.uri  + '] is invalid');
    port = authority.port() || (isTls ? 443 : 80);
    assert.ok(port, 'Port of URI [' + args.uri  + '] is invalid');
    path = (heirpart.path().value || '') + (uri.querystring() || '');

    if(args.config.proxy) {
        var proxyConfig = args.config.proxy;
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
        method: args.method,
        headers: args.headers
    };
    client = isTls ? https : http;

    // Send
    sendMessage(args, client, options, 0);
}

function sendMessage(args, client, options, retry) {
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

    if(args.emitter) {
        var uniqueId = uuid();
        var packet = {
            line: args.statement.line,
            id: uniqueId,
            uuid: args.httpReqTx.event.uuid,
            method: options.method,
            uri: args.uri,
            headers: [],
            body: args.body,
            start: reqStart,
            type: eventTypes.STATEMENT_REQUEST
        };
        if(args.body) {
            packet.body = args.body;
        }
        _.each(args.headers, function(v, n) {
            packet.headers.push({
                name: n,
                value: v
            });
        });
        args.emitter.emit(packet.type, packet);
    }

    clientRequest = client.request(options, function(res) {
        setEncoding(res);
        respData = '';
        var responseLength = 0;
        res.on('data', function (chunk) {
            responseLength += chunk.length;

            var maxResponseLength = getMaxResponseLength(args.config, args.logEmitter);

            if (responseLength > maxResponseLength) {
                var err = new Error('Response length exceeds limit');
                err.uri = args.uri;
                err.status = 502;

                args.logEmitter.emitError(args.httpReqTx.event, 'error with uri - ' + args.uri + ' - ' +
                    'response length ' + responseLength + ' exceeds config.maxResponseLength of ' + maxResponseLength +
                    ' ' + (Date.now() - start) + 'msec');
                res.socket.destroy();
                return args.httpReqTx.cb(err);
            }
            respData += chunk;

        });
        res.on('end', function() {
            timings.receive = Date.now() - reqStart;
            if(args.emitter) {
                var packet = {
                    line: args.statement.line,
                    uuid: args.httpReqTx.event.uuid,
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
                args.emitter.emit(eventTypes.STATEMENT_RESPONSE, packet);

                if(res.headers[args.requestId]) {
                    args.emitter.emit(eventTypes.REQUEST_ID_RECEIVED, res.headers[args.requestId]);
                }
                else {
                    // Send back the uuid created in ql.io, if the underlying api
                    // doesn't support the request tracing or the table is not configured with
                    // the right name of the header.
                    args.emitter.emit(eventTypes.REQUEST_ID_RECEIVED, args.headers[args.requestId]);
                }
            }

            // TODO: Handle redirects

	        // Transform (patch only)
            var result = args.resource.parseResponse(args.parsed, args.params, res.headers, respData);
            respData = (result && result.body) ? result.body : respData;
            res.headers = (result && result.headers) ? result.headers : res.headers;

            mediaType = sniffMediaType(args.resource, args.parsed, args.params, res, respData);

            args.logEmitter.emitEvent(args.httpReqTx.event, args.uri + '  ' +
                util.inspect(options) + ' ' +
                res.statusCode + ' ' + mediaType.type + '/' + mediaType.subtype + ' ' +
                util.inspect(res.headers) + ' ' + (Date.now() - start) + 'msec');

            // Parse
            jsonify(respData, mediaType, res.headers, args.xformers, function(respJson) {
                status = args.resource.patchStatus(args.parsed, args.params, res.statusCode, res.headers, respJson || respData)
                    || res.statusCode;

                if(status >= 200 && status <= 300) {
                    if(respJson) {
                        respJson = args.resource.patchResponse(args.parsed, args.params, res.statusCode, res.headers, respJson);
                        // Projections
                        project.run(args.resource.resultSet, args.statement, respJson, function(filtered) {
                            return args.httpReqTx.cb(undefined, {
                                headers: {
                                    'content-type':  'application/json'
                                },
                                body: filtered
                            });
                        });
                    }
                    else {

                        return args.httpReqTx.cb(undefined, {
                            headers: {
                                'content-type': mediaType
                            },
                            body: respData
                        });
                    }
                }
                else {
                    return args.httpReqTx.cb({
                        headers: {
                            'content-type':  respJson ? 'application/json' : mediaType
                        },
                        body: respJson || respData
                    });
                }
            }, function(error) {
                error.body = respData;
                return args.httpReqTx.cb(error);
            });
        });
    });

    if(args.body) {
        clientRequest.write(args.body);
        timings.send = Date.now() - reqStart;
    }
    clientRequest.on('error', function(err) {
        args.logEmitter.emitError(args.httpReqTx.event, 'error with uri - ' + args.uri + ' - ' +
            err.message + ' ' + (Date.now() - start) + 'msec');
        // For select, retry once on network error
        if(retry === 0 && args.statement.type === 'select') {
            args.logEmitter.emitEvent(args.httpReqTx.event, 'retrying - ' + args.uri + ' - ' + (Date.now() - start) + 'msec');
            sendMessage(args, client, options, 1);
        }
        else {
            err.uri = uri;
            err.status = 502;
            return args.httpReqTx.cb(err);
        }
    });
    clientRequest.end();
}

function setEncoding(res){
    var contentType = _headers.parse('content-type', res.headers['content-type'] || '');
    var encoding = contentType.subtype === 'csv' ? 'ascii' : 'utf8';

    if(contentType.subtype == 'binary') {
        encoding = 'binary';
    }

    if(contentType.params && contentType.params.charset){
        encoding = contentType.params.charset == 'us-ascii' ? 'ascii' : 'utf8';
    }
    res.setEncoding(encoding);
}

function sniffMediaType(resource, resourceUri, params, res, respData) {
    // 1. If there is a patch, call it to get the media type.
    var mediaType = resource.patchMediaType(resourceUri, params, res.statusCode, res.headers, respData)
        || res.headers['content-type'];

    // 2. If the media type is "XML", treat it as "application/xml"
    mediaType = mediaType === 'XML' ? 'application/xml' : mediaType;

    // 3. If the media type is "JSON", treat it as "application/json"
    mediaType = mediaType === 'JSON' ? 'application/json' : mediaType;

    // If none found, assume "application/json"
    mediaType = mediaType || 'application/json';

    // 4. If the media type is "text/xml", treat it as "application/xml"
    mediaType = (mediaType === 'text/xml') ? 'application/xml' : mediaType;

    return _headers.parse('content-type', mediaType);
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
