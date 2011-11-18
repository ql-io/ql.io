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

"use strict"

var _ = require('underscore'),
    sys = require('sys'),
    Console = require('../app.js'),
    Engine = require('ql.io-engine'),
    EventEmitter = require('events').EventEmitter,
    WebSocketClient = require('websocket').client,
    testCase = require('nodeunit').testCase;

var c;

module.exports = testCase({
    'compile error' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            // Ready to run tests now.
            testRunner('showa tables', test, {
                ack : 1,
                compileError : 1,
                compileOk : 0,
                inFlight : 0,
                error : 0,
                done : 1,
                success : 1,
                request : 0,
                response : 0
            }, c.app);
        })
    },

    'show tables' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            testRunner('show tables', test, {
                ack : 1,
                compileOk : 1,
                compileError : 0,
                inFlight : 1,
                error : 0,
                done : 1,
                success : 1,
                request : 0,
                response : 0
            }, c.app);
        })
    },

    'desc' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            testRunner('desc foo', test, {
                ack : 1,
                compileOk : 1,
                compileError : 0,
                inFlight : 1,
                error : 1,
                done : 1,
                success : 0,
                request : 0,
                response : 0
            }, c.app);
        })
    },

    'select ok' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            testRunner('select * from finditems where keywords = "ipad"', test, {
                ack : 1,
                compileOk : 1,
                compileError : 0,
                inFlight : 1,
                success : 1,
                error : 0,
                done : 1,
                request : 1,
                response : 1
            }, c.app);
        })
    },

    'define' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
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
            testRunner(script, test, {
                ack : 1,
                compileError : 0,
                compileOk : 1,
                inFlight : 3,
                success : 3,
                error : 0,
                done : 1,
                request : 0,
                response : 0
            }, c.app)
        })
    },

    'multiple requests' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var script = "select p.Title, ps.inventoryCountResponse.totalCount from ebay.shopping.products as p, ebay.shopping.productstats as ps where p.QueryKeywords = 'iPhone' and p.siteid = '0' and ps.productID = p.ProductID[0].Value";
            testRunner(script, test, {
                ack : 1,
                compileError : 0,
                compileOk : 1,
                inFlight : 1,
                success : 1,
                error : 0,
                done : 1,
                request : 6,
                response : 6
            }, c.app)
        })
    }
});

function testRunner(script, test, obj, app) {
    var emitter = new EventEmitter();
    var ack = 0, compileOk = 0, compileError = 0, inFlight = 0, success = 0, error = 0, done = 0, request = 0, response = 0;
    emitter.on(Engine.Events.SCRIPT_ACK, function() {
        ack++;
    });
    emitter.on(Engine.Events.SCRIPT_COMPILE_OK, function() {
        compileOk++;
    });
    emitter.on(Engine.Events.SCRIPT_COMPILE_ERROR, function() {
        compileError++;
    });
    emitter.on(Engine.Events.STATEMENT_IN_FLIGHT, function() {
        inFlight++;
    });
    emitter.on(Engine.Events.STATEMENT_SUCCESS, function() {
        success++;
    });
    emitter.on(Engine.Events.STATEMENT_ERROR, function() {
        error++;
    });
    emitter.on(Engine.Events.STATEMENT_REQUEST, function() {
        request++;
    });
    emitter.on(Engine.Events.STATEMENT_RESPONSE, function() {
        response++;
    });

    var conn;
    emitter.on(Engine.Events.SCRIPT_DONE, function(data, connection) {
        done++;
        test.equals(obj.ack, ack);
        test.equals(obj.compileError, compileError);
        test.equals(obj.compileOk, compileOk);
        test.equals(obj.inFlight, inFlight);
        test.equals(obj.error, error);
        test.equals(obj.request, request);
        test.equals(obj.response, response);
        test.equals(obj.done, done);
        app.close();
        connection.close();
        test.done();
    });
    var socket = new WebSocketClient();
    var events = [Engine.Events.SCRIPT_ACK, Engine.Events.SCRIPT_COMPILE_ERROR, Engine.Events.SCRIPT_COMPILE_OK,
        Engine.Events.STATEMENT_ERROR, Engine.Events.STATEMENT_IN_FLIGHT, Engine.Events.STATEMENT_SUCCESS,
        Engine.Events.STATEMENT_REQUEST, Engine.Events.STATEMENT_RESPONSE, Engine.Events.SCRIPT_DONE];
    socket.on('connect', function(connection) {
        conn = connection;
        // Tell the server what notifications to receive
        var packet = {
            type : 'events',
            data : JSON.stringify(events)
        }
        connection.sendUTF(JSON.stringify(packet));

        packet = {
            type : 'script',
            data : script
        }
        connection.sendUTF(JSON.stringify(packet));
        connection.on('message', function(message) {
            var event = JSON.parse(message.utf8Data);
            emitter.emit(event.type, event.data, connection);
        });
    });
    socket.connect("ws://localhost:3000/", 'ql.io-console');
}
