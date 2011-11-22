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
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter;

var engine = new Engine({
    config: __dirname + '/config/dev.json',
    'connection': 'close'
});

module.exports = {
    'select-header-fill': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using headers 'Foo' = '{foo}'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1\n\
                 resultset 'findItemsByKeywordsResponse.searchResult.item'\n\
            select * from header.replace where keywords = 'ferrari' and foo = 'BAR' limit 1";
        var emitter = new EventEmitter();
        var headers;
        emitter.on(Engine.Events.STATEMENT_REQUEST, function(v) {
            headers = v.headers;
        });

        engine.exec({
            script: script,
            emitter: emitter,
            cb: function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.ok(value);
                    test.equals(value, 'BAR');
                    test.done();
                }
            }
        });
    },

    'select-header-leave': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using headers 'Foo' = '{foo}'\n\
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
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.equal(value, '');
                    test.done();
                }
            }
        });
    },

    'select-header-fill-from-defaults': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using headers 'Foo' = '{foo}'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1, foo = 'foo-default'\n\
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
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.ok(value);
                    test.equals(value, 'foo-default');
                    test.done();
                }
            }
        });
    },

    'select-header-fill-from-headers': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using headers 'Foo' = '{foo}'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1, foo = 'foo-default'\n\
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
                headers: {
                    'foo' : 'foo-header'
                }
            },
            cb: function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.ok(value);
                    test.equals(value, 'foo-header');
                    test.done();
                }
            }
        });
    },

    'select-header-fill-from-params': function(test) {
        var script = "create table header.replace\n\
            on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'\n\
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\n\
                 using headers 'Foo' = '{foo}'\n\
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\n\
                       apikey =  '{config.ebay.apikey}', limit = 10,\n\
                       pageNumber = 1, foo = 'foo-default'\n\
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
                    'foo' : 'foo-param'
                }
            },
            cb: function(err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(headers);
                    var value;
                    _.each(headers, function(header) {
                        if(header.name === 'foo') {
                            value = header.value;
                        }
                    });
                    test.ok(value);
                    test.equals(value, 'foo-param');
                    test.done();
                }
            }
        });
    }
}
