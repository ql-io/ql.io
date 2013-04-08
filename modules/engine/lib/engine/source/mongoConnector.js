/*
 * Copyright 2013 eBay Software Foundation
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
    mongo = require('mongodb');

var mongoConnector = module.exports = function(table, statement, type, bag, path){
    this.table = table;
    this.type = type;
    this.__proto__ = statement;
    this['patch uri'] = function(args) { return args.uri; };
    this.uris = function(args, params, statement) {
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
                params: params,
                log: self.curry(self.log, args.logEmitter, args.parentEvent)
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
        return _.map(temp, function(uri){
            var punctuated = uri.split(':');
            return {
                uri: punctuated[0],
                port: parseInt(punctuated[1]),
                db: punctuated[2]
            }
        });

        //return temp;
    };
    _process(this, statement, bag, path);
    this.exec = function(args) {
        var self = this, holder = {};
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
        args.params = params;
        var expects = [];
        if(args.statement.expects){
            for(var i in args.statement.expects){
                var expect = args.statement.expects[i]
                var name = expect.name
                var expectval = args.context[name]
                if(expectval){
                    expects.push(expectval)
                    continue
                }
                expectval = params[name];
                if(!expectval && expect.required) {
                    args.callback(e);
                } else {
                    expects.push(expectval);
                }
            }
        }
        var resourceUri;
        try {
            resourceUri = args.resource.uris(args, params, statement);
        }
        catch(e) {
            return args.callback(e);
        }


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

        _.each(resourceUri, function (uri) {
            tasks.push(function (uri) {
                return function (callback) {
                    send(self, args, uri, expects, function (e, r) {
                        callback(e, r);
                    });
                }
            }(uri));
        });
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
                            ret.body = result;
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

    }

function send(verb, args, destination, params, cb) {
    var client = new mongo.Db(destination.db, new mongo.Server(destination.uri, destination.port, {}), {w: 1}),
        test = function (err, collection) {


            if (err) cb(err);
            // Locate all the entries using find
            var s = statement;
            var mycb = function(err,results){
                verb['patch-'+verb.method].apply(verb,[err,results,client,cb])

            }
            params.push(mycb)
            collection[statement.method].apply(collection,params)
        };

    client.open(function(err, p_client) {
        client.collection('test_insert', test);
    });

}

// Curry function for money patch logging
this.curry = function(log) {
    var slice = Array.prototype.slice,
        partialArgs = slice.call(arguments, 1);
    return function () {
        var args = slice.call(arguments);
        return log.apply(null, partialArgs.concat(args));
    }
};

this.log = function(emitter, parentEvent, severity, message) {
    severity = severity || '';
    switch(severity) {
        case 'error':
            emitter.emitError(parentEvent, message);
            break;
        case 'warn':
            emitter.emitWarning(parentEvent, message);
            break;
        default:
            emitter.emitEvent(parentEvent, message);
    }
};
};
mongoConnector.connectorName = 'mongodb'

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