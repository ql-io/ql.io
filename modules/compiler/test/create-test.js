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

var compiler = require('../lib/compiler');

exports['simple'] = function(test) {
    var q = "create table twitter.public on select get from 'http://twitter.com/statuses/public_timeline.{^format}'  using defaults format = 'json'";
    var compiled = compiler.compile(q);
    var e = { type: 'create',
            name: 'twitter.public',
            line: 1,
            select:
            { method: 'get',
                uri: 'http://twitter.com/statuses/public_timeline.{^format}',
                defaults: { format: 'json' },
                aliases: {},
                headers: {},
                resultSet: '',
                cache: {},
                body: '' },
            id: 0 };
    test.deepEqual(compiled.rhs, e);
    test.done();
};

exports['multiple actions'] = function(test) {
    var q = 'create table bitly.shorten\
  on insert get from "http://api.bitly.com/v3/shorten?login={^login}&apiKey={^apikey}&longUrl={^longUrl}&format={format}"\
            using defaults apikey = "{config.tables.bitly.shorten.apikey}", login = "{config.tables.bitly.shorten.login}", format = "json"\
            using patch "shorten.js"\
            resultset "data.url"\
  on select get from "http://api.bitly.com/v3/expand?login={^login}&apiKey={^apikey}&shortUrl={^shortUrl}&format={format}"\
            using defaults apikey = "{config.tables.bitly.shorten.apikey}", login = "{config.tables.bitly.shorten.login}", format = "json"\
            using patch "shorten.js"\
            resultset "data.expand"';
    var compiled = compiler.compile(q);
    var e = { type: 'create',
            name: 'bitly.shorten',
            line: 1,
            insert:
            { method: 'get',
                uri: 'http://api.bitly.com/v3/shorten?login={^login}&apiKey={^apikey}&longUrl={^longUrl}&format={format}',
                defaults:
                { apikey: '{config.tables.bitly.shorten.apikey}',
                    login: '{config.tables.bitly.shorten.login}',
                    format: 'json' },
                aliases: {},
                headers: {},
                resultSet: 'data.url',
                cache: {},
                patch: 'shorten.js',
                body: '' },
            select:
            { method: 'get',
                uri: 'http://api.bitly.com/v3/expand?login={^login}&apiKey={^apikey}&shortUrl={^shortUrl}&format={format}',
                defaults:
                { apikey: '{config.tables.bitly.shorten.apikey}',
                    login: '{config.tables.bitly.shorten.login}',
                    format: 'json' },
                aliases: {},
                headers: {},
                resultSet: 'data.expand',
                cache: {},
                patch: 'shorten.js',
                body: '' },
            id: 0 };
    test.deepEqual(compiled.rhs, e);
    test.done();
};

exports['media type'] = function(test) {

    var script = '-- This is a mapping for eBay\'s [GetMyEbayBuying](http://developer.ebay.com/DevZone/xml/docs/Reference/ebay/GetMyeBayBuying.html) API. Here is an example: select * from ebay.trading.getmybuying\n\
create table ebay.trading.getmyebaybuying\
  on select post to "{config.tables.ebay.trading.myebaybuying.uri}"\
    using headers "Content-Type"= "application/xml; charset=UTF-8",\
                  "X-EBAY-API-DETAIL-LEVEL"= "0",\
                  "X-EBAY-API-RESPONSE-ENCODING"= "XML",\
                  "X-EBAY-API-CALL-NAME"= "GetMyeBayBuying",\
                  "X-EBAY-API-SITEID" = "0",\
                  "X-EBAY-API-COMPATIBILITY-LEVEL"= "723"\
    using defaults format = "{config.tables.ebay.trading.myebaybuying.defaults.format}",\
              globalid = "{config.tables.ebay.trading.myebaybuying.defaults.globalid}",\
              currency = "{config.tables.ebay.trading.myebaybuying.defaults.currency}",\
              itemSearchScope = "{config.tables.ebay.trading.myebaybuying.defaults.itemSearchScope}",\
              limit = "{config.tables.ebay.trading.myebaybuying.defaults.limit}",\
              offset = "{config.tables.ebay.trading.myebaybuying.defaults.offset}",\
              eBayAuthToken = "{config.tables.ebay.trading.myebaybuying.defaults.eBayAuthToken}"\
    using patch "getmyebaybuying.js"\
    using bodyTemplate "getmyebaybuying.xml.mu" type "application/xml"';
    var compiled = compiler.compile(script);
    test.equals(compiled.rhs.select.body.type, 'application/xml');
    test.done();
};

exports['media type param'] = function(test) {

    var script = '-- This is a mapping for eBay\'s [GetMyEbayBuying](http://developer.ebay.com/DevZone/xml/docs/Reference/ebay/GetMyeBayBuying.html) API. Here is an example: select * from ebay.trading.getmybuying\n\
create table ebay.trading.getmyebaybuying\n\
  on select post to "{config.tables.ebay.trading.myebaybuying.uri}"\n\
    using headers "Content-Type"= "application/xml; charset=UTF-8",\n\
                  "X-EBAY-API-DETAIL-LEVEL"= "0",\n\
                  "X-EBAY-API-RESPONSE-ENCODING"= "XML",\n\
                  "X-EBAY-API-CALL-NAME"= "GetMyeBayBuying",\n\
                  "X-EBAY-API-SITEID" = "0",\n\
                  "X-EBAY-API-COMPATIBILITY-LEVEL"= "723"\n\
    using defaults format = "{config.tables.ebay.trading.myebaybuying.defaults.format}",\n\
              globalid = "{config.tables.ebay.trading.myebaybuying.defaults.globalid}",\n\
              currency = "{config.tables.ebay.trading.myebaybuying.defaults.currency}",\n\
              itemSearchScope = "{config.tables.ebay.trading.myebaybuying.defaults.itemSearchScope}",\n\
              limit = "{config.tables.ebay.trading.myebaybuying.defaults.limit}",\n\
              offset = "{config.tables.ebay.trading.myebaybuying.defaults.offset}",\n\
              eBayAuthToken = "{config.tables.ebay.trading.myebaybuying.defaults.eBayAuthToken}"\n\
    using patch "getmyebaybuying.js"\n\
    using bodyTemplate "getmyebaybuying.xml.mu" type "application/xml;foo=bar"';

    try {
        var compiled = compiler.compile(script);
        test.equals(compiled.rhs.select.body.type, 'application/xml;foo=bar');
        test.done();
    }
    catch(e) {
        console.log(e.stack || e);
    }
};

exports['media type form'] = function(test) {

    var script = '-- This is a mapping for eBay\'s [GetMyEbayBuying](http://developer.ebay.com/DevZone/xml/docs/Reference/ebay/GetMyeBayBuying.html) API. Here is an example: select * from ebay.trading.getmybuying\n\
create table ebay.trading.getmyebaybuying\n\
  on select post to "{config.tables.ebay.trading.myebaybuying.uri}"\n\
    using headers "Content-Type"= "application/xml; charset=UTF-8",\n\
                  "X-EBAY-API-DETAIL-LEVEL"= "0",\n\
                  "X-EBAY-API-RESPONSE-ENCODING"= "XML",\n\
                  "X-EBAY-API-CALL-NAME"= "GetMyeBayBuying",\n\
                  "X-EBAY-API-SITEID" = "0",\n\
                  "X-EBAY-API-COMPATIBILITY-LEVEL"= "723"\n\
    using defaults format = "{config.tables.ebay.trading.myebaybuying.defaults.format}",\n\
              globalid = "{config.tables.ebay.trading.myebaybuying.defaults.globalid}",\n\
              currency = "{config.tables.ebay.trading.myebaybuying.defaults.currency}",\n\
              itemSearchScope = "{config.tables.ebay.trading.myebaybuying.defaults.itemSearchScope}",\n\
              limit = "{config.tables.ebay.trading.myebaybuying.defaults.limit}",\n\
              offset = "{config.tables.ebay.trading.myebaybuying.defaults.offset}",\n\
              eBayAuthToken = "{config.tables.ebay.trading.myebaybuying.defaults.eBayAuthToken}"\n\
    using patch "getmyebaybuying.js"\n\
    using bodyTemplate "getmyebaybuying.xml.mu" type "application/x-www-form-urlencoded"';

    try {
        var compiled = compiler.compile(script);
        test.equals(compiled.rhs.select.body.type, 'application/x-www-form-urlencoded');
        test.done();
    }
    catch(e) {
        console.log(e.stack || e);
    }
};

exports['auth'] = function(test) {
    var script = 'create table ebay.finding.items on select get from "{config.tables.ebay.finding.items.url}" authenticate using "authmod"';
    try {
        var compiled = compiler.compile(script);
        test.equals(compiled.rhs.select.auth, 'authmod');
        test.done();
    }
    catch(e) {
        console.log(e.stack || e);
    }
}
