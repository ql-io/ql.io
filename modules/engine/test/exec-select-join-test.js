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
    sys = require('sys');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    connection: 'close'
});

module.exports = {
    'join-err': function(test) {
        var q = "select p.Title, ps.inventoryCountResponse.totalCount from ebay.products as p, ebay.shopping.productstats as ps where p.QueryKeywords = 'iPhone' and p.siteid = '0' and ps.productID = p.ProductID[0].Value";
        engine.exec(q, function(err) {
            if(err) {
                test.ok(true, 'failed');
                test.done();
            }
            else {
                test.done();
            }
        });
    },

    'join-select':function(test) {
        var script = 'products = select * from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\
        prodstats = select * from ebay.shopping.productstats where productID in ("{products.ProductID[0].Value}");\
        joined = select p.StockPhotoURL, ps.productId, ps.inventoryCountResponse\
          from products as p, prodstats as ps where ps.productId = p.ProductID[0].Value;\
        return {\
         "p": "{products.ProductID[0].Value}",\
         "s": "{prodstats.productId}",\
         "j": "{joined}"\
        }';
        engine.exec(script, function(err, result) {
            test.ok(result.body);
            test.ok(result.body.p);
            test.ok(result.body.s);
            var count = 0;
            _.each(result.body.p, function(id) {
                test.equal(id, result.body.s[count]);
                test.equal(id, result.body.j[count][1]);
                count++;
            })
            test.done();
        });
    },

    'join-select-alias':function(test) {
        var script = 'products = select * from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\
            prodstats = select * from ebay.shopping.productstats where productID in ("{products.ProductID[0].Value}");\
            joined = select p.StockPhotoURL as url, ps.productId as id, ps.inventoryCountResponse as count\
              from products as p, prodstats as ps where ps.productId = p.ProductID[0].Value;\
            return {\
             "p": "{products.ProductID[0].Value}",\
             "s": "{prodstats.productId}",\
             "j": "{joined}",\
             "jid": "{joined.id}"\
            }';
        engine.exec(script, function(err, result) {
            if(err) {
                console.log(err.stack || err);
                test.ok(false, err);
                test.done();
            }
            else {
                test.ok(result.body);
                test.ok(result.body.p);
                test.ok(result.body.s);
                var count = 0;
                _.each(result.body.p, function(id) {
                    test.equal(id, result.body.s[count]);
                    test.equal(id, result.body.j[count].id);
                    test.equal(id[0], result.body.jid[count][0]);
                    count++;
                })
                test.done();
            }
        });
    },

    'select-join-removal-from-both':function(test) {
        var q = 'products = select * from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\n\
                 prodstats = select * from ebay.shopping.productstats where productID in ("{products.ProductID[0].Value}");\n\
                 return select p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.productId, ps.inventoryCountResponse\n\
                         from products as p, prodstats as ps where ps.productId = p.ProductID[0].Value';
        engine.exec(q, function(err, result) {
            if(err) {
                test.ok(false, err);
                test.done();
            }
            else {
                test.ok(result.body);
                test.ok(result.body[0]);
                test.equal(result.body[0].length, 5);
                test.done();
            }
        });
    },

    'select-join-removal-from-main': function(test) {
        var q = 'products = select * from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\n\
                   prodstats = select * from ebay.shopping.productstats where productID in ("{products.ProductID[0].Value}");\n\
                   return select p.ProductID[0].Value, p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.productId, ps.inventoryCountResponse\n\
                           from products as p, prodstats as ps where ps.productId = p.ProductID[0].Value';
        engine.exec(q, function(err, result) {
            if(err) {
                test.ok(false, 'not failed');
                test.done();
            }
            else {
                test.ok(result.body);
                test.ok(result.body[0]);
                test.equal(result.body[0].length, 6);
                test.done();
            }
        });
    },

    'select-join-removal-from-join': function(test) {
        var q = 'products = select * from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\n\
                   prodstats = select * from ebay.shopping.productstats where productID in ("{products.ProductID[0].Value}");\n\
                   return select p.ProductID[0].Value, p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.inventoryCountResponse\n\
                           from products as p, prodstats as ps where ps.productId = p.ProductID[0].Value';
        engine.exec(q, function(err, result) {
            if(err) {
                test.ok(false, 'not failed');
                test.done();
            }
            else {
                test.ok(result.body);
                test.ok(result.body[0]);
                test.equal(result.body[0].length, 5);
                test.done();
            }
        });
    },

    'select-join-match-join': function(test) {
        var q = 'products = select * from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\n\
                 prodstats = select * from ebay.shopping.productstats where productID in ("{products.ProductID[0].Value}");\n\
                 return select ps.productId, p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.inventoryCountResponse, p.ProductID[0].Value\n\
                        from products as p, prodstats as ps where ps.productId = p.ProductID[0].Value';
        engine.exec(q, function(err, result) {
            if(err) {
                test.ok(false, 'not failed');
                test.done();
            }
            else {
                test.ok(result.body);
                test.ok(result.body[0]);
                for(var i = 0; i < result.body[i]; i++) {
                    test.equals(result.body[i].length, 6);
                    test.equals(result.body[i][0], result.body[i][5]);
                }
                test.done();
            }
        });
    }

}