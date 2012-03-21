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

var _ = require('underscore'),
    project = require('../project.js'),
    eventTypes = require('../event-types.js'),
    _headers = require('headers'),
    http = require('http'),
    util = require('util');

parseResponse = exports.parseResponse = function(timings, reqStart, args, res, bufs) {
    timings.receive = Date.now() - reqStart;

    // TODO: Handle redirects
    // The default patch decodes the response
    var result = args.resource.parseResponse(res.headers, bufs, args);
    return result;
}

exports.exec = function(timings, reqStart, args, uniqueId, res, start, result, options) {
    var mediaType, status;

    res.headers['content-type'] = result.type || res.headers['content-type'];
    var respData = result.content;

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
        _.each(res.headers, function (v, n) {
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

    mediaType = sniffMediaType(res, respData, args);

    args.logEmitter.emitEvent(args.httpReqTx.event, args.uri + '  ' +
        util.inspect(options) + ' ' +
        res.statusCode + ' ' + mediaType.type + '/' + mediaType.subtype + ' ' +
        util.inspect(res.headers) + ' ' + (Date.now() - start) + 'msec');

    // Parse
    jsonify(args.table, respData, mediaType, res.headers, args.xformers, function (respJson) {
        status = args.resource.patchStatus(res.statusCode, res.headers, respJson || respData, args)
            || res.statusCode;

        if(status >= 200 && status <= 300) {
            if(respJson) {
                respJson = args.resource.patchResponse(res.statusCode, res.headers, respJson, args);
                // Projections
                project.run(args.resource.resultSet, args.statement, respJson, function (filtered) {
                    return args.httpReqTx.cb(undefined, {
                        headers: {
                            'content-type': 'application/json'
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
                    'content-type': respJson ? 'application/json' : mediaType
                },
                body: respJson || respData
            });
        }
    }, function (error) {
        error.body = respData;
        return args.httpReqTx.cb(error);
    });
}

function jsonify(table, respData, mediaType, headers, xformers, respCb, errorCb) {

    if (!respData || /^\s*$/.test(respData)) {
        respCb({});
    }
    else if(xformers[table]) {
        xformers[table].toJson(respData, respCb, errorCb, headers);
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


function sniffMediaType(res, respData, args) {
    // 1. If there is a patch, call it to get the media type.
    var mediaType = args.resource.patchMediaType(res.statusCode, res.headers, respData, args)
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



