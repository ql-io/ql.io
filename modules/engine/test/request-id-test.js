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

var _ = require('underscore'),
    Engine = require('lib/engine'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter;

var engine = new Engine({
    config: __dirname + '/config/dev.json',
    'connection': 'close'
});

module.exports = {
    'mint-request-id': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1\n\
                 resultset 'findItemsByKeywordsResponse.searchResult.item'\n\
            select * from header.replace where keywords = 'ferrari' limit 1";
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
                }
                test.done();
            }
        });
    },

    'incoming-request-id-from-ddl': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using headers 'request-id' = 'my-own-request-id'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1\n\
                 resultset 'findItemsByKeywordsResponse.searchResult.item'\n\
            select * from header.replace where keywords = 'ferrari' limit 1";
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
            }
        });
    },

    'incoming-request-id-from-request': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1\n\
                 resultset 'findItemsByKeywordsResponse.searchResult.item'\n\
            select * from header.replace where keywords = 'ferrari' limit 1";
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
            }
        });
    },
    'incoming-x-request-id-from-request': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1\n\
                 resultset 'findItemsByKeywordsResponse.searchResult.item'\n\
            select * from header.replace where keywords = 'ferrari' limit 1";
        var emitter = new EventEmitter();
        var request_headers, response_headers;
        emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
            request_headers = v.headers;
        });

        emitter.on(Engine.Events.STATEMENT_RESPONSE, function(v) {
            response_headers = v.headers;
        });

        var engine = new Engine({
            config: __dirname + '/config/dev.json',
            'connection': 'close',
            'request-id': 'x-ebay-soa-request-id'
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
                    console.log(err.stack || sys.inspect(err, false, 10));
                    test.ok(false);
                }
                else {
                    var reqId = _.detect(request_headers, function(v) {
                        return v.name === 'x-ebay-soa-request-id'
                    });
                    var sentReqId = reqId && reqId.value;
                    test.ok(~sentReqId.indexOf('my-own-request-id!ql.io!'));

                    var responseReqId = _.detect(response_headers, function(v) {
                        return v.name === 'x-ebay-soa-request-id'
                    });
                    var receivedReqId = responseReqId && responseReqId.value;
                    test.ok(~receivedReqId.indexOf('my-own-request-id!ql.io!'));

                    var requestId = result.headers['request-id'];
                    test.ok(requestId && ~requestId.indexOf('my-own-request-id!ql.io!'));

                }
                test.done();
            }
        });
    },
    'request-id-from-join-stmt' : function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1\n\
                 resultset 'findItemsByKeywordsResponse.searchResult.item'\n\
            one = select * from header.replace where keywords = 'ferrari' limit 5;" +
            "two = select * from header.replace where keywords = 'bmw' limit 5;" +
            "return select o.title[0], t.title[0] from one as o, two as t where o.country[0] =  t.country[0] ;";
        var emitter = new EventEmitter();
        var request_headers, response_headers;
        emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
            request_headers = v.headers;
        });

        emitter.on(Engine.Events.STATEMENT_RESPONSE, function(v) {
            response_headers = v.headers;
        });

        var engine = new Engine({
            config: __dirname + '/config/dev.json',
            'connection': 'close',
            'request-id': 'x-ebay-soa-request-id'
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
                    var reqId = _.detect(request_headers, function(v) {
                        return v.name === 'x-ebay-soa-request-id'
                    });
                    var sentReqId = reqId && reqId.value;
                    test.ok(~sentReqId.indexOf('my-own-request-id!ql.io!'));

                    var responseReqId = _.detect(response_headers, function(v) {
                        return v.name === 'x-ebay-soa-request-id'
                    });
                    var receivedReqId = responseReqId && responseReqId.value;
                    test.ok(~receivedReqId.indexOf('my-own-request-id!ql.io!'));

                    var requestId = result.headers['request-id'];

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
            }
        });
    }
}
