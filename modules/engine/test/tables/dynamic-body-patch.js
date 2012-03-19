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

var MutableURI = require('ql.io-mutable-uri'),
    fs = require('fs'),
    mustache = require('mustache'),
    assert = require('assert');

exports['patch uri'] = function(args) {
    assert(typeof args.log === 'function');
    return new MutableURI('https://api.ebay.com/ws/api.dll?appid=Qlio1a92e-fea5-485d-bcdb-1140ee96527&version=723');
}

exports['patch headers'] = function(args) {
    assert(typeof args.log === 'function');
    return {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '723',
        'X-EBAY-API-APP-NAME': "{config.tables.ebay.trading.bestoffers.appname}",
        'X-EBAY-API-DEV-NAME': '{config.tables.ebay.trading.bestoffers.devname}',
        'X-EBAY-API-CERT-NAME': '{config.tables.ebay.trading.bestoffers.certname}',
        'X-EBAY-API-CALL-NAME': 'getItem'
    };
}

exports['body template'] = function(args) {
    assert(typeof args.log === 'function');
    var content = fs.readFileSync(__dirname + '/getitem.xml.mu', 'utf8');
    return {
        type: 'application/xml',
        content: content
    };
}

exports['patch body'] = function(args) {
    assert(typeof args.log === 'function');
    var content = fs.readFileSync(__dirname + '/getitem.xml.mu', 'utf8');
    content = mustache.to_html(content, {
        params: args.params
    });
    return {
        type: 'application/xml',
        content: content
    };
}