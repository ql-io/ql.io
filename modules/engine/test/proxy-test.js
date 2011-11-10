/**
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
    Engine = require('lib/engine'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter();


var logger = require('winston');
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level:'error'});

var engine = new Engine({
    tables:__dirname + '/tables',
    config:__dirname + '/config/proxy.json',
    connection:'close'
});

module.exports = {

    'select-without-proxy':function (test) {
        var q;
        q = 'select * from ebay.finding.items where keywords = "ipad"';
        engine.exec(q, function (err, list) {
            if (err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {

                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(!_.isArray(list.body[0]), 'expected object in the array');
                test.done();
            }
        });
    },

    'test-star':function (test) {
        var q = "select * from google.shopping where barcode = '09780802453792'";
        try {
            engine.exec(q, function (err) {
                if (err) {
                    test.ok(true);
                }
                else {
                    test.fail("should not pass as the proxy used is non existent");
                }
            });
        }
        catch (err) {

        }
        test.done();

    },

    'select-with-proxy':function (test) {
        var q = "select Location from ebay.shopping.item where itemId in (select itemId from ebay.finding.items where keywords='ipad')"
        try {
            engine.exec(q, function (err) {
                if (err) {
                    test.ok(true);
                }
                else {
                    test.fail("should not pass as the proxy used is non existent");
                }
            });
        }
        catch (err) {

        }
        test.done();
    }
}