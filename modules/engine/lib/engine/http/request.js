/*
 * Copyright 2012 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var _ = require('underscore'),
    assert = require('assert'),
    eventTypes = require('../event-types.js'),
    http = require('http'),
    https = require('https'),
    URI = require('uri'),
    response = require('./response.js'),
    zlib = require('zlib'),
    uuid = require('node-uuid'),
    jsonfill = require('../jsonfill.js'),
    FormData = require('form-data'),
    util = require('util'),
    charlie = require('charlie');

var maxResponseLength;

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

    assert.ok(args.name, 'table name not specified');

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
    // Avoid request backlog on any given socket.
    client.globalAgent.maxSockets = 1000;
    // Send
    sendMessage(args, client, options, 0);
}

function putInCache(key, cache, result, res, expires) {
    if (key && cache) {
        cache.put(key, {result:result, res:{headers:res.headers,
            statusCode:res.statusCode}}, expires);
    }
}

function sendHttpRequest(client, options, args, start, timings, reqStart, key, cache, expires, uniqueId, status, retry, redirects) {

    var packet = {
        line: args.statement.line,
        uuid: args.parentEvent.uuid,
        method: options.method,
        uri: args.uri,
        headers: [],
        start: reqStart,
        type: eventTypes.STATEMENT_REQUEST
    };

    _.each(args.headers, function(v, n) {
        packet.headers.push({
            name: n,
            value: v
        });
    });

    var responseLength = 0;
    args.httpReqTx = args.logEmitter.beginEvent({
        parent: args.parentEvent,
        name: 'http-request',
        message: packet,
        cb: function(err, results){
            var processingEvent = args.logEmitter.beginEvent({
                parent: args.parentEvent,
                name: 'processingEvent',
                message: 'calculates cpu time',
                    cb: function(){}
            })
            if(args.logEmitter){
                var reqlength = JSON.stringify(options.headers).length +options.host.length;
                if(options.body){
                    reqlength += JSON.stringify(options.body).length
                }
                args.logEmitter.emitEvent(JSON.stringify({
                    reqSize: reqlength,
                    resSize: responseLength
                }))
            }
            var toreturn = args.cb(err, results)
            processingEvent.end();
            return toreturn

        }
    });

    if(args.emitter) {
        packet.id = uniqueId;
        // Add the body here to avoid logging body to logEmitter
        if(args.body) {
            packet.body = args.body;
        }
        args.emitter.emit(packet.type, packet);

    }

    if (args.parts && args.statement.parts) {
        var form = new FormData();
        if (args.body) {
            form.append('body', new Buffer(args.body));
        }

        var tmp_parts = { 'req' : { 'parts' : args.parts }};

        _.each(args.statement.parts, function(p) {
            var part = jsonfill.lookup(p, tmp_parts);

            if (part) {
                form.append(part.name, part.data);
            }
        });

        _.extend(options.headers, form.getCustomHeaders(args.resource.body.type));
    }

    var followRedirects = true, maxRedirects = 10;

    // Exponential backff with a reset
    var minDelay = args.statement.minDelay|| 500;
    var maxDelay = args.statement.maxDelay || 30000;
    var timeout = args.statement.timeout || 10000;
    var decision = charlie.ask([args.uri, args.name], minDelay, maxDelay);
    if(decision.state === 'nogo') {
        var err = new Error('Back-off in progress');
        err.uri = args.uri;
        err.status = 502;
        err.start = decision.start;
        err.count = decision.count;
        err.delay = decision.delay;
        return args.httpReqTx.cb(err);
    }

    // As of node 0.6.17, 'timeout' events can get emitted after we get a valid response from
    // the socket. We need to work-around that for now.
    var happy = false; // This flag keeps track of whether we're getting response and to skip timeout events.
    var clientRequest = client.request(options, function (res) {
        // Tell charlie that things are good.
        charlie.ok([args.uri, args.name]);

        if (followRedirects && (res.statusCode >= 301 && res.statusCode <= 307) &&
            (options.method.toUpperCase() === 'GET' || options.method.toUpperCase() === 'HEAD')) {
            res.socket.destroy();
            if (res.statusCode === 305) { // Log but don't follow
                args.logEmitter.emitWarning(args.httpReqTx.event, JSON.stringify({
                    status: res.statusCode, headers: res.headers
                }));
                var err = new Error('Received status code 305 from downstream server');
                err.uri = args.uri;
                err.status = 502;
                return args.httpReqTx.cb(err);
            }
            else if (res.statusCode !== 304 && res.statusCode !== 306) { // Only follow 301, 302, 303, 307
                if (res.headers.location) {
                    if (redirects++ >= maxRedirects) {
                        args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                            redirects: maxRedirects
                        }));
                        var err = new Error('Exceeded max redirects');
                        err.uri = args.uri;
                        err.status = 502;
                        return args.httpReqTx.cb(err);
                    }

                    var location = new URI(res.headers.location);

                    if (location.isAbsolute()) {
                        options.host = location.heirpart().authority().host();
                        options.port = location.heirpart().authority().port();
                    } else {
                        location = new URI(args.uri);
                        location = location.resolveReference(res.headers.location);
                    }
                    options.path = location.heirpart().path();

                    args.logEmitter.emitEvent(args.httpReqTx.event, {
                        redirects: redirects,
                        status: res.statusCode,
                        location: res.headers.location
                    });

                    // End the current event.
                    args.logEmitter.endEvent(args.httpReqTx.event, 'Redirecting to ' + res.headers.location);

                    sendHttpRequest(client, options, args, start, timings, reqStart, key, cache, expires, uniqueId, status, retry, redirects);
                    return;
                }
                else {
                    args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                        message: 'Missing location header',
                        status: res.statusCode,
                        headers: res.headers
                    }));
                    var err = new Error('Missing Location header in redirect');
                    err.uri = args.uri;
                    err.status = 502;
                    return args.httpReqTx.cb(err);
                }
            }
        }

        var bufs = []; // array for bufs for each chunk
        var contentEncoding = res.headers['content-encoding'];
        var zipped = false, unzip;
        var result;
        if (contentEncoding) {
            contentEncoding = contentEncoding.toLowerCase();
            if (contentEncoding === 'gzip') {
                unzip = zlib.createGunzip();
            }
            else if (contentEncoding === 'deflate') {
                unzip = zlib.createInflate();
            }
            else {
                var err = new Error('Content-Encoding \'' + contentEncoding + '\' is not supported');
                err.uri = args.uri;
                err.status = 502;
                args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                    message: 'Content encoding ' + contentEncoding + ' is not supported'
                }));
                res.socket.destroy();
                return args.httpReqTx.cb(err);
            }
            zipped = true;

            unzip.on('data', function (chunk) {
                bufs.push(chunk);
            });
            unzip.on('end', function () {
                result = response.parseResponse(timings, reqStart, args, res, bufs);
                putInCache(key, cache, result, res, expires);
                response.exec(timings, reqStart, args, uniqueId, res, start, result, options);
            });
            unzip.on('error', function (err) {
                var err = new Error('Corrupted stream');
                err.uri = args.uri;
                err.status = 502;
                args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                    message: contentEncoding + ' stream corrupted'
                }));
                res.socket.destroy();
                return args.httpReqTx.cb(err);
            });
        }

        res.on('data', function (chunk) {
            happy = true;
            if (zipped) {
                // TODO Check for corrupted stream. Empty 'bufs' may indicate invalid stream
                unzip.write(chunk);
            }
            else {
                // Chunk is a buf as we don't set any encoding on the response
                bufs.push(chunk);
            }
            responseLength += chunk.length;
            maxResponseLength = maxResponseLength || getMaxResponseLength(args.config, args.logEmitter);
            if (responseLength > maxResponseLength) {
                var err = new Error('Response length exceeds limit');
                err.uri = args.uri;
                err.status = 502;

                args.logEmitter.emitError(args.httpReqTx.event, JSON.stringify({
                    message: 'Response length ' + responseLength + ' exceeds config.maxResponseLength of ' + maxResponseLength
                }));
                res.socket.destroy();
                return args.httpReqTx.cb(err);
            }
        });
        res.on('end', function () {
            happy = true;
            if (zipped) {
                unzip.end();
            }
            else {
                result = response.parseResponse(timings, reqStart, args, res, bufs);
                putInCache(key, cache, result, res, expires);
                response.exec(timings, reqStart, args, uniqueId, res, start, result, options, status);
            }
        });
    });

    if (args.parts && form) {
        form.pipe(clientRequest);
        timings.send = Date.now() - reqStart;
    } else if (args.body) {
        clientRequest.write(args.body);
        timings.send = Date.now() - reqStart;
    }


    var timedout = false;
    clientRequest.setTimeout(timeout, function() {
        if(happy) {
            args.logEmitter.emitWarning(args.httpReqTx.event, {
                message: "'timeout' received when not expected"
            });
            return;
        }
        timedout = true;

        if (retry === 0 && args.statement.type === 'select') {
            _retry(args, client, options, 'timeout');
        }
        else {
            // No need to end/destroy the socket since node does it.
            charlie.notok([args.uri, args.name]);
            return args.httpReqTx.end({
                message: 'Request timed out',
                timeout: timeout,
                uri: args.uri,
                status: 502
            });
        }
    });
    clientRequest.on('error', function(err) {
        // timeout also triggers error
        if(timedout) {
            return;
        }
        // Destroy the socket first
        clientRequest.connection.destroy();

        args.logEmitter.emitError(args.httpReqTx.event, {
            message: err ? err.code || err.message : 'Network error'
        });
        // For select, retry once on network error
        if (!timedout && retry === 0 && args.statement.type === 'select') {
            _retry(args, client, options, 'Network Error');
        }
        else {
            charlie.notok([args.uri, args.name]);
            err = err || {
                message: err ? err.code || err.message : 'Network error'
            }
            err.uri = args.uri;
            err.status = 502;
            return args.httpReqTx.cb(err);
        }
    });
    clientRequest.end();
}

function _retry(args, client, options, reason) {
    var msg = 'Retrying on ' + reason + ' - ' + args.uri;
    args.logEmitter.emitEvent(args.httpReqTx.event, {
        message: msg
    });
    // End the current event.
    args.logEmitter.endEvent(args.httpReqTx.event, msg);
    sendMessage(args, client, options, 1);
}

function sendMessage(args, client, options, retry) {
    var status, start = Date.now(), key = args.key, cache = args.cache,
        expires = args.expires || 3600;
    var reqStart = Date.now();
    var timings = {
        "blocked": -1,
        "dns": -1,
        "connect": -1,
        "send": -1,
        "wait": -1,
        "receive": -1
    };

    if (key && cache) {
        cache.get(key,function(err,result){
            if(err || !result.data){
                sendHttpRequest(client, options, args, start, timings, reqStart,
                    key, cache, expires, uuid(), status, retry, 0);
            }
            else {
                args.httpReqTx = args.logEmitter.beginEvent({
                    parent: args.parentEvent,
                    type: 'http-request',
                    message: key, // TODO
                    cb: args.cb
                });
                args.logEmitter.emitEvent(args.httpReqTx.event, {
                    'cache-key': key,
                    'hit': true
                });
                response.exec(timings, reqStart, args, uuid(), result.data.res, start, result.data.result, options);
            }
        });
    }
    else {
        sendHttpRequest(client, options, args, start, timings, reqStart, key, cache, expires, uuid(), status, retry, 0);
    }
}

function getMaxResponseLength(config, logEmitter) {
    if(config && config.maxResponseLength) {
        return config.maxResponseLength;
    }
    else {
        var max = 10000000; // default to 10,000,000
        logEmitter.emitWarning(JSON.stringify({
            message: 'config.maxResponseLength is undefined! Defaulting to ' + max
        }));
        return max;
    }
}
