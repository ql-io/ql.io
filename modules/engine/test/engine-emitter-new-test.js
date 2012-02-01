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

var _ = require('underscore'),
    Engine = require('../lib/engine');

module.exports = {

    'compile-err': function(test) {
        var engine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        var script;
        script = 'desca table foo';
        var compileError = 0, ack = 0, done = 0;
        engine.execute(script, function(req) {
            req.on(Engine.Events.SCRIPT_ACK, function() {
                ack++;
            });
            req.on(Engine.Events.SCRIPT_COMPILE_ERROR, function() {
                compileError++;
            });
            req.on(Engine.Events.SCRIPT_DONE, function() {
                done++;
            });
            req.on('end', function() {
                test.equals(1, ack);
                test.equals(1, done);
                test.equals(1, compileError);
                test.done();
            })
        });
    },

    'show tables': function(test) {
        var engine = new Engine();
        var script;
        script = 'show tables';
        var inFlight = 0, success = 0, error = 0;
        engine.execute(script, function(req) {
            req.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
                inFlight++;
            });
            req.on(Engine.Events.STATEMENT_SUCCESS, function() {
                success++;
            });
            req.on(Engine.Events.STATEMENT_ERROR, function() {
                error++;
            });
            req.on('end', function() {
                test.equals(1, inFlight);
                test.equals(1, success);
                test.done();
            })
        });
    },

    'desc': function(test) {
        var engine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        var script;
        script = 'desc foo';
        var inFlight = 0, success = 0, error = 0;
        engine.execute(script, function(req) {
            req.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
                inFlight++;
            });
            req.on(Engine.Events.STATEMENT_SUCCESS, function() {
                success++;
            });
            req.on(Engine.Events.STATEMENT_ERROR, function() {
                error++;
            });
            req.on('end', function() {
                test.equals(1, inFlight);
                test.equals(1, error);
                test.done();
            })
        })
    },

    'select-error': function(test) {
        var engine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        var script;
        script = 'select * from ebay.finding.items';
        var inFlight = 0, success = 0, error = 0;
        engine.execute(script, function(req) {
            req.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
                inFlight++;
            });
            req.on(Engine.Events.STATEMENT_SUCCESS, function() {
                success++;
            });
            req.on(Engine.Events.STATEMENT_ERROR, function() {
                error++;
            });
            req.on('end', function() {
                test.equals(1, inFlight);
                test.equals(1, error, 'Did not get an error');
                test.done();
            })
        })
    },

    'select-ok': function(test) {
        var engine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        var script;
        script = 'select * from ebay.finding.items where keywords = "ipad"';
        var inFlight, success, error, request, response;
        engine.execute(script, function(req) {
            req.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
                inFlight = true;
            });
            req.on(Engine.Events.STATEMENT_SUCCESS, function() {
                success = true;
            });
            req.on(Engine.Events.STATEMENT_REQUEST, function() {
                request = true;
            });
            req.on(Engine.Events.STATEMENT_RESPONSE, function() {
                response = true;
            });
            req.on(Engine.Events.STATEMENT_ERROR, function() {
                error = true;
            });
            req.on('end', function() {
                test.ok(inFlight);
                test.ok(request);
                test.ok(response);
                test.ok(success, 'Failed');
                test.done();
            })
        })
    },

    'define': function(test) {
        var engine = new Engine({
            tables : __dirname + '/tables',
            config: __dirname + '/config/dev.json'
        });
        var script = 'data = {\
                "name" : {\
                    "first" : "Hello",\
                    "last" : "World"\
                },\
                "addresses" : [\
                    {\
                        "street" : "1 Main Street",\
                        "city" : "No Name"\
                    },\
                    {\
                        "street" : "2 Main Street",\
                        "city" : "Some Name"\
                    }]\
            };\
            fields = select addresses[0].street, addresses[1].city, name.last from data;\
            return {"result" : "{fields}"};'
        var ack = 0, done = 0, inFlight = 0, success = 0, error = 0;
        engine.execute(script, function(req) {
            req.on(Engine.Events.SCRIPT_ACK, function() {
                ack++;
            });
            req.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
                inFlight++;
            });
            req.on(Engine.Events.STATEMENT_SUCCESS, function() {
                success++;
            });
            req.on(Engine.Events.STATEMENT_ERROR, function() {
                error++;
            });
            req.on(Engine.Events.SCRIPT_DONE, function() {
                done++;
            });
            req.on('end', function() {
                test.equals(1, ack);
                test.equals(3, inFlight);
                test.equals(3, success, 'Failed');
                test.equals(1, done);
                test.done();
            })
        })
    }

}

