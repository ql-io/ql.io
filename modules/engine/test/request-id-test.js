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

"use strict";

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    fs = require('fs'),
    http = require('http'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

var engine = new Engine({
    config: __dirname + '/config/dev.json'
});

module.exports = {
    'mint-request-id': function(test) {
         var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
            });
	    var script = fs.readFileSync(__dirname + '/mock/finditems.ql', 'UTF-8');
            var emitter = new EventEmitter();
            var headers;
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
               headers = v.headers;
            });
            engine.exec({
               script: script,
               emitter: emitter,
               cb: function(err, result) {
                   if (err) {
                       console.log(err.stack || err);
                       test.ok(false);
                   }
                   else {
                       var reqId = _.detect(headers, function(v) {
                           return v.name == 'request-id'
                       });
                       test.ok(reqId && reqId.value);
                       test.ok(result.headers["request-id"]);
                       test.ok(reqId.value+']' === result.headers["request-id"]);
                   }
                   test.done();
		   server.close();
               }
            });
	});
    },
    'incoming-request-id-from-ddl': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/finditems-reqid.ql', 'UTF-8');
            var emitter = new EventEmitter();
            var headers;
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
              headers = v.headers;
            });
            var testok;
            engine.exec({
               script: script,
               emitter: emitter,
               cb: function(err, result) {
                  if (err) {
                     console.log(err.stack || err);
                     test.ok(false);
                   }
                  else {
                     var reqId = _.detect(headers, function(v) {
                        return v.name === 'request-id'
                     });
                     var sentReqId = reqId && reqId.value;
                     test.ok(~sentReqId.indexOf('my-own-request-id!ql.io!'));
                   }
                   test.done();
	           server.close();
               }
            });
       });
    },
    'incoming-request-id-from-request': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/finditems.ql', 'UTF-8');

            var emitter = new EventEmitter();
            var headers;
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
               headers = v.headers;
            });
            engine.exec({
               script: script,
               emitter: emitter,
               request: {
                  params: {
                    'request-id' : 'my-own-request-id'
                  }
               },
               cb: function(err, result) {
                  if (err) {
                     console.log(err.stack || err);
                     test.ok(false);
                   }
                  else {
                     var reqId = _.detect(headers, function(v) {
                        return v.name === 'request-id'
                      });
                     var sentReqId = reqId && reqId.value;
                     test.ok(~sentReqId.indexOf('my-own-request-id!ql.io!'));
                   }
                  test.done();
		  server.close();
               }
            });
        });
    },
    'incoming-x-request-id-from-request': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            var script = fs.readFileSync(__dirname + '/mock/finditems.ql', 'UTF-8');
            var emitter = new EventEmitter();
            var requestHeaders, responseHeaders;
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
                requestHeaders = v.headers;
            });

            emitter.on(Engine.Events.STATEMENT_RESPONSE, function(v) {
                responseHeaders = v.headers;
            });

            var engine = new Engine({
                config: __dirname + '/config/dev.json',
                'request-id': 'x-my-request-id'
            });
            engine.exec({
                script: script,
                emitter: emitter,
                request: {
                    headers: {
                      'request-id' : 'my-own-request-id'
                    }
                },

               cb: function(err, result) {
                    if (err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.ok(false);
                    }
                    else {
                        var reqId = _.detect(requestHeaders, function (v) {
                            return v.name === 'x-my-request-id'
                        });
                        var sentReqId = reqId && reqId.value;
                        test.ok(~sentReqId.indexOf('my-own-request-id!ql.io!'));

                        var responseReqId = _.detect(responseHeaders, function (v) {
                            return v.name === 'x-my-request-id'
                        });
                        var receivedReqId = responseReqId && responseReqId.value;
                        test.ok(~receivedReqId.indexOf('my-own-request-id!ql.io!'));

                        var requestId = result.headers['x-my-request-id'];
                        test.ok(requestId && ~requestId.indexOf('my-own-request-id!ql.io!'));
                    }
                    test.done();
		            server.close();
                }
            });
        });
    },
    'request-id-from-join-stmt' : function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            var script = fs.readFileSync(__dirname + '/mock/req-id-test.ql', 'UTF-8');
            var emitter = new EventEmitter();
            var requestHeaders, responseHeaders;
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
                requestHeaders = v.headers;
            });

            emitter.on(Engine.Events.STATEMENT_RESPONSE, function(v) {
                responseHeaders = v.headers;
            });

            var engine = new Engine({
                config: __dirname + '/config/dev.json',
                'request-id': 'x-my-request-id'
            });
            engine.exec({
                script: script,
                emitter: emitter,
                request: {
                    headers: {
                        'request-id' : 'my-own-request-id'
                    }
                },

                cb: function(err, result) {
                    if (err) {
                        console.log(err.stack || err);
                        test.ok(false);
                    }
                    else {
                        var reqId = _.detect(requestHeaders, function(v) {
                            return v.name === 'x-my-request-id'
                        });
                        var sentReqId = reqId && reqId.value;
                        test.ok(~sentReqId.indexOf('my-own-request-id!ql.io!'));

                        var responseReqId = _.detect(responseHeaders, function(v) {
                            return v.name === 'x-my-request-id'
                        });
                        var receivedReqId = responseReqId && responseReqId.value;
                        test.ok(~receivedReqId.indexOf('my-own-request-id!ql.io!'));

                        var requestId = result.headers['x-my-request-id'];

                        test.ok(requestId && ~requestId.indexOf('my-own-request-id!ql.io!'));
                        //Look for the second occurence as the script made two calls.
                        test.ok(requestId && ~requestId.indexOf('my-own-request-id!ql.io!', 1));

                        var parenStack = [];

                        // Check for the matching parens. Very primitive implementation.
                        // TODO change to RegEx if possible.
                        for (var i = 0; i < requestId.length; i++) {
                            var c = requestId.charAt(i);
                            if (c === '[') {
                                parenStack.push(c);

                            }
                            else if (c === ']') {
                                c = parenStack.pop();
                                if(!c) {
                                    test.fail("requestId is wrong. The parenthesis are not matching. request-id = " + requestId );
                                }
                            }
                        }
                        if (parenStack.length > 0) {
                            test.fail("requestId is wrong. The parenthesis are not matching. request-id = " + requestId);
                        }
                    }
                    test.done();
                    server.close();
                }
            });
        });
    },
    'ip-in-request-id' : function (test) {
        var server = http.createServer(function(req, res) {
            res.writeHead(200, {
                'Content-Length' : 0
            });
            res.end();
        });

        server.listen(3000, function() {
            var engine = new Engine({
            });
            var script = 'create table tab on select get from "http://localhost:3000/"; select * from tab';
            var emitter = new EventEmitter();
            var headers;
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
                headers = v.headers;
            });
            engine.exec({
                script: script,
                emitter: emitter,
                cb: function(err, result) {
                    if (err) {
                        console.log(err.stack || err);
                        test.ok(false);
                    }
                    else {
                        var reqId = _.detect(headers, function(v) {
                            return v.name == 'request-id'
                        });
                        test.ok(reqId.value.indexOf('127') === -1);
                    }
                    test.done();
                    server.close();
                }
            });
        });
    }
}; 
