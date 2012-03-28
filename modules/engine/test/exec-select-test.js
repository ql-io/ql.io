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
    util = require('util'),
    MutableURI = require('ql.io-mutable-uri'),
    EventEmitter = require('events').EventEmitter,
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

var Listener = require('./utils/log-listener.js');

module.exports = {

    'join': function(test) {
        var i, found = false;
        var q = "select p.Title, ps.inventoryCountResponse.totalCount from ebay.shopping.products as p, ebay.shopping.productstats as ps where p.QueryKeywords = 'iPhone' and p.siteid = '0' and ps.productID = p.ProductID[0].Value";
        var listener = new Listener(engine);
        engine.exec(q, function(err, list) {
            listener.assert(test);
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(_.isArray(list.body[0]), 'expected array in the array');
                for(i = 0; i < list.body.length; i++) {
                    found = list.body[i].length === 2;
                    if(found) {
                        break;
                    }
                }
                test.ok(found, 'expected three fields for at least one- ' + util.inspect(list.body, false, 10));
                test.done();
            }
        });
    },

    'validator': function(test) {
        var q;
//        The table first doesn't exist
        q = 'select * from first where keywords = "ipad" and globalid="XYZ"';
        var listener = new Listener(engine, false);
        engine.exec(q, function(err) {
            listener.assert(test);
            if(err) {
                test.ok(true, 'Good.');
                test.done();
            }
            else {
                test.ok(false, 'Expected to fail');
                test.done();
            }
        });
    },
    'pagination': function(test) {
        var parsed, page;
        var q = "select title[0], itemId[0] \
            from ebay.finding.items where keywords= 'cooper' and FreeShippingOnly = 'true' and MinPrice = '100' \
            limit 10 offset ";

        var listener = function(payload) {
            parsed = new MutableURI(payload.uri);
        }
        var emitter = new EventEmitter();
        emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

        var listener = new Listener(engine);
        engine.exec({
            emitter: emitter,
            script: q + "110",
            cb: function(err) {
                listener.assert(test);
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Failed.');
                    test.done();
                }
                else {
                    // Check the paginationInput.pageNumber parameter.
                    page = parsed.getParam('paginationInput.pageNumber')
                    test.equals(page, 11);
                    test.done();
                }
            }
        });
    },


    'only-comments': function(test) {
        var q = " --blah \n     \
                  --blah \n     \
                  -- blah";
        engine.exec(q, function(err, list) {
            test.fail('nothing to execute and return');
        });
        test.ok(true);
        test.done();
    },


}
