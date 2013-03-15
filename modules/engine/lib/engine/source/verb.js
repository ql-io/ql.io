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

    this.exec = function(args){
        this.connector.exec(args, statement, type);
    }



};