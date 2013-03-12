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
    strTemplate = require('ql.io-str-template'),
    uriTemplate = require('ql.io-uri-template'),
    fs = require('fs'),
    normalize = require('path').normalize,
    request = require('../http/request.js'),
    _util = require('../util.js'),
    Iconv  = require('iconv').Iconv,
    HttpConnector = require('./httpConnector.js'),
    mongoConnector = require('./mongoConnector.js');

var Verb = module.exports = function(table, statement, type, bag, path, conn) {
    this.table = table;
    this.type = type;
    this.__proto__ = statement;
    this.connector = conn;
    switch(conn){
        case 'mongodb':
            this.connector = new mongoConnector(table, statement, type, bag, path);
            break;
        default :
            this.connector = new HttpConnector(table, statement, type, bag, path);

    }


    // May override patches
    _process(this, statement, bag, path);

    this.exec = function(args){
        this.connector.exec(args, statement, type);
    }



};

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

function send(verb, args, uri, params, cb) {
    // Authenticate the request
    if(verb.auth) {
        verb.auth.auth(params, args.config, function (err) {
            if(err) {
                return cb(err);
            }
        });
    }

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
            args.logEmitter.emitWarning(args.parentEvent, 'unable to parse header ' + v + ' error: ' + e.stack || e);
        }
        headers[k.toLowerCase()] = v;
    });

    var reqIdName = args.settings['request-id'] ? args.settings['request-id'] : 'request-id';
    headers[reqIdName]  = (params['request-id'] || args.resource.headers['request-id'] ||
        args.parentEvent.uuid) + '!ql.io' + '!' + getIp() + '[';

    // Monkey patch headers
    try {
        headers = args.resource.patchHeaders(parsed, headers, args);
    }
    catch(e) {
        return cb(e);
    }

    // Body
    var body;
    if(args.resource.method === 'post' || args.resource.method === 'put' || args.resource.method === 'delete' || args.resource.method === 'patch') {
        var payload = args.resource.tmpl(parsed, params, headers, args);
        body = payload.content;
        if (args.resource.opaque){
            body = args.resource.opaque;
        }
        if(body) {
            headers['content-length'] = body.length;
        }
        if(!headers['content-type'] && payload.type) {
            headers['content-type'] = payload.type || verb.body.type;
        }
    }

    // Resource key to use in the cache
    var key;
    if(verb.cache.expires){
        key = args.resource.computeKey(verb.table, args.resource.method || 'GET', uri, params, headers, body, reqIdName, args);
    }

    request.send({
        name: args.name,
        cb: cb,
        table: verb.table,
        config: args.config || {},
        uri: uri,
        parsed: parsed,
        method: args.resource.method || 'GET',
        headers: headers,
        body: body,
        params: params,
        parts: args.parts,
        parentEvent: args.parentEvent,
        requestId: reqIdName,
        emitter: args.emitter,
        logEmitter: args.logEmitter,
        statement: args.statement,
        resource: args.resource,
        xformers: args.xformers,
        key: key,
        cache: args.cache,
        expires: verb.cache.expires
    });
}


function getIp() {
    var ips = _.pluck(_.filter(_.flatten(_.values(os.networkInterfaces())), function (ip) {
        return ip.internal === false && ip.family === 'IPv4';
    }), 'address');

    return ips.length > 0 ? ips[0] : '127.0.0.1';
};
