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

/**
 * This module executes select statements
 */

'use strict';

var brew = require('./brew.js'),
    _ = require('underscore'),
    assert = require('assert'),
    logEmitter =  require('./log-emitter.js'),
    sys = require('sys');

exports.exec = function(opts, statement, cb, parentEvent) {
    brew.go({
        path: process.cwd() + '/',
        name: '',
        statement: statement,
        cb: function(err, resource) {
            if(err) {
                logEmitter.emitError(err);
                return cb(err);
            }
            else {
                assert.ok(resource, 'resource should not be null');
                opts.tempResources[resource.name] = resource;
                return cb(undefined, {
                            headers: {
                                'content-type': 'application/json'
                            },
                            body: {
                                message: 'ok'
                            }
                });
            }
        }
    });

}