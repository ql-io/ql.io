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

var compiler = require('../lib/compiler'),
    _ = require('underscore');

module.exports = {

    'select-script': function(test) {
        var q = 'a = select * from foo;\n\
                 results = select title[0],\n\
                      itemId[0], primaryCategory[0].categoryName[0], sellingStatus[0].currentPrice[0]\n\
                      from a;\n\
                 return results;';
        var statement = compiler.compile(q);
        test.equals(statement.type, 'return');
        test.equals(statement.rhs.ref, 'results');
        test.equals(statement.rhs.dependsOn.length, 1);
        test.equals(statement.rhs.dependsOn[0].assign, 'results');
        test.equals(statement.rhs.dependsOn[0].type, 'select');
        test.equals(statement.rhs.dependsOn[0].listeners.length, 1);
        test.equals(statement.rhs.dependsOn[0].listeners[0].type, 'ref');
        test.equals(statement.rhs.dependsOn[0].dependsOn.length, 1);
        test.equals(statement.rhs.dependsOn[0].dependsOn[0].assign, 'a');
        test.equals(statement.rhs.dependsOn[0].dependsOn[0].type, 'select');
        test.equals(statement.rhs.dependsOn[0].dependsOn[0].listeners.length, 1);
        test.equals(statement.rhs.dependsOn[0].dependsOn[0].listeners[0].type, 'select');
        test.done();
    },

    'select-dependencies-from': function(test) {
        var script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\n\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                  bidList = select GetMyeBayBuyingResponse.BidList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                  bestOfferList = select GetMyeBayBuyingResponse.BestOfferList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                  watches = select * from watchList;\n\
                  return {\n\
                      "itemDetails" : "{watches}"\n\
                  };'
        var plan = compiler.compile(script);
        test.equals(plan.type, 'return');
        test.equals(plan.rhs.type, 'define');
        test.equals(plan.rhs.dependsOn[0].assign, 'bidList'); // orphan
        test.equals(plan.rhs.dependsOn[1].assign, 'bestOfferList'); // orphan
        test.equals(plan.rhs.dependsOn[2].assign, 'watches');
        test.equals(plan.rhs.dependsOn[2].dependsOn[0].assign, 'watchList');
        test.equals(plan.rhs.dependsOn[2].dependsOn[0].listeners[0].assign, 'watches');
        test.equals(plan.rhs.dependsOn[2].dependsOn[0].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
        test.equals(plan.rhs.dependsOn[2].dependsOn[0].dependsOn[0].listeners[0].assign, 'watchList');
        test.done();
    },

    'select-dependencies-where-in': function(test) {
        var script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  itemDetails = select * from ebay.multipleitems where itemId in "{watchList.ItemID.text.$}";\
                  return {\
                    "itemDetails" : "{itemDetails}"\
                  };'

        var plan = compiler.compile(script);
        test.equals(plan.rhs.dependsOn[0].assign, 'itemDetails');
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].assign, 'watchList');
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
        test.done();
    },

    'select-dependencies-where-eq': function(test) {
        var script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  itemDetails = select * from ebay.multipleitems where itemId = "{watchList.ItemID.text.$}";\
                  return {\
                    "itemDetails" : "{itemDetails}"\
                  };'

        var plan = compiler.compile(script);
        test.equals(plan.rhs.dependsOn[0].assign, 'itemDetails');
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].assign, 'watchList');
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
        test.done();
    },

    'select-dependencies-where-eq-complex': function(test) {
        var script = '-- Get myeBayBuying\n\
                  GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\
                  -- Get myeBaySelling\n\
                  GetMyeBaySellingResponse = select * from ebay.getmyebayselling;\
                  -- Extract sub-lists\n\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  bidList = select GetMyeBayBuyingResponse.BidList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  bestOfferList = select GetMyeBayBuyingResponse.BestOfferList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  activeList = select GetMyeBaySellingResponse.ActiveList.ItemArray.Item.BuyItNowPrice from GetMyeBaySellingResponse;\
                  itemDetails = select * from ebay.multipleitems where itemId in (watchList.ItemID.text.$, bidList.ItemID.text.$, bestOfferList.ItemID.text.$, activeList.ItemID.text.$);\
                  watches = select w.ItemID.text.$, w.Title.text.$, w.Seller.UserID.text.$, w.ListingType.text.$, w.SellingStatus.CurrentPrice.text.$, \
                            w.SellingStatus.CurrentPrice, w.ConvertedCurrentPrice,\
                            d.CurrentPrice.Value, d.ConvertedCurrentPrice.Value, d.Seller.FeedbackScore, d.ShippingCostSummary.ShippingServiceCost,\
                            d.ShipToLocations, d.ShippingCostSummary.ShippingType, d.QuantitySold, d.StartTime, d.EndTime, d.PictureURL, d.GalleryURL, d.HitCount,\
                            d.HighBidder, d.BestOfferEnabled from watchList as w, itemDetails as d where d.ItemID = w.ItemID.text.$;\
                  return {\
                    "itemDetails" : "{itemDetails}"\
                  };';
        try {
            var plan = compiler.compile(script);
            test.equals(plan.rhs.dependsOn.length, 2);
            test.equals(plan.rhs.dependsOn[0].assign, 'watches');
            test.equals(plan.rhs.dependsOn[1].dependsOn.length, 4);
            test.equals(plan.rhs.dependsOn[1].dependsOn[0].assign, 'watchList');
            test.equals(plan.rhs.dependsOn[1].dependsOn[0].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
            test.equals(plan.rhs.dependsOn[1].dependsOn[1].assign, 'bidList');
            test.equals(plan.rhs.dependsOn[1].dependsOn[1].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
            test.equals(plan.rhs.dependsOn[1].dependsOn[2].assign, 'bestOfferList');
            test.equals(plan.rhs.dependsOn[1].dependsOn[2].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
            test.equals(plan.rhs.dependsOn[1].dependsOn[3].assign, 'activeList');
            test.equals(plan.rhs.dependsOn[1].dependsOn[3].dependsOn[0].assign, 'GetMyeBaySellingResponse');
            test.done();
        }
        catch(e) {
            console.log(e.stack);
            test.fail(e);
            test.done();
        }

    },

    'select-dependencies-in-clause': function(test) {
        var script = 'ipads = select itemId[0] from ebay.finding.items where keywords = "ipad" limit 10;\n\
                  details = select * from ebay.item where itemId in (select itemId[0] from ipads);\n\
                  return {\n\
                    "ipads" : "{details}"\n\
                  };'
        try {
            var plan = compiler.compile(script);
            test.equals(plan.rhs.dependsOn.length, 1);
            test.equals(plan.rhs.dependsOn[0].type, 'select');
            test.equals(plan.rhs.dependsOn[0].dependsOn.length, 1);
            test.equals(plan.rhs.dependsOn[0].dependsOn[0].type, 'select');
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.fail(e);
            test.done();
        }
    },

    'script-define' : function(test) {
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
return {"result" : "{fields}"};\
'
        try {
            var plan = compiler.compile(script);
            test.equals(plan.type, 'return');
            test.equals(plan.rhs.dependsOn.length, 1);
            test.equals(plan.rhs.dependsOn[0].type, 'select')
            test.equals(plan.rhs.dependsOn[0].dependsOn.length, 1);
            test.equals(plan.rhs.dependsOn[0].dependsOn[0].type, 'define');
            test.done();
        }
        catch(e) {
            test.fail(e);
            test.done();
        }
    },

    'comment-at-end': function(test) {
        var script = 'foo = select * from fool;\n\
                      return foo;\n\
                      -- a comment';
        try {
            var plan = compiler.compile(script);
            test.equals(plan.rhs.ref, 'foo');
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.fail(e);
            test.done();
        }
    },

    'crlf-at-end': function(test) {
        var script = 'foo = select * from fool;\n\
        a = {};\n\
        -- \n\
        -- a\n\
        return foo;\n\
        -- a comment\n\
        \n\
        ';
        try {
            var plan = compiler.compile(script);
            test.equals(plan.rhs.ref, 'foo');
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.fail(e);
            test.done();
        }
    },

    'number-parsing': function(test) {
        var script = 'a = 1;\n\
        b = +1;\n\
        c = -1;\n\
        d = 1.234;\n\
        e = -1.234;\n\
        f = 1e;\n\
        g = 1e1;\n\
        h = 1e+1;\n\
        i = 1e-1;\n\
        j = 1.0e-1;\n\
        return ["{a}","{b}","{c}","{d}","{e}","{f}","{g}","{h}","{i}","{j}"]';
        var plan;
        var res = [1, 1, -1, 1.234, -1.234, 1, 10, 10, 0.1, 0.01];
        plan = compiler.compile(script);
        for(var i = 0; i < i.length; i++) {
            test.equals(plan.dependsOn[i], 'define');
            test.equals(plan.dependsOn[i].object, res[i]);
        }
        test.done();
    },

    'null-val': function(test) {
        var script = 'a = null';
        try {
            var plan = compiler.compile(script);
            test.ok(plan.rhs.object === null);
            test.equals(plan.rhs.assign, 'a');
            test.done()
        }
        catch(e) {
            console.log(e.stack || e);
            test.ok(false);
            test.done();
        }
    },

    'escaped-quotes': function(test) {
        var script = 'a = "Hello\\"World"';
        try {
            var plan = compiler.compile(script);
            test.equals(plan.rhs.object, "Hello\"World");
            test.done()
        }
        catch(e) {
            console.log(e.stack || e);
            test.ok(false);
            test.done();
        }
    },

    'escaped-apos': function(test) {
        var script = "a = 'Hello\\'World'";
        try {
            var plan = compiler.compile(script);
            test.equals(plan.rhs.object, 'Hello\'World');
            test.done()
        }
        catch(e) {
            console.log(e.stack || e);
            test.ok(false);
            test.done();
        }
    },

    'indexed-prop-ref': function(test) {
        var script = "select 'b-1', 'b-3'['c-1'] from a;";
        var plan = compiler.compile(script);
        test.equals(plan.rhs.columns[0].name, 'b-1');
        test.equals(plan.rhs.columns[1].name, 'b-3[c-1]');
        test.done();
    },

    'circular-ref': function(test) {
        var script = 'foo = select * from foo;\n\
                      return foo;';
        try {
            compiler.compile(script);
            test.ok(false, 'Not failed on circular ref');
            test.done();
        }
        catch(e) {
            test.ok(true);
            test.done();
        }
    },

    'block comments': function(test) {
        var script = "-- line comment\n\
            \n\
        /* block comment\n\
        block\n\
        */\n\
        /** another block */\n\
            \n\
        return 'foo';";

        var plan = compiler.compile(script);
        test.equal(plan.comments.length, 3);
        test.equal(plan.comments[0].text, 'line comment');
        test.equal(plan.comments[1].text, 'block comment\n        block\n        ');
        test.equal(plan.comments[2].text, 'another block ');
        test.done();
    },

    'var-subst-orphans': function(test) {
        var script = 'var1 = "hello";var2 = "{var1.prop}"; var3 = "{var2.prop}"; return {};';
        var plan = compiler.compile(script);
        test.equals(plan.rhs.dependsOn.length, 1);
        test.equals(plan.rhs.dependsOn[0].assign, 'var3');
        test.equals(plan.rhs.dependsOn[0].dependsOn.length, 1);
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].assign, 'var2');
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].dependsOn.length, 1);
        test.equals(plan.rhs.dependsOn[0].dependsOn[0].dependsOn[0].assign, 'var1');
        test.done();
    }
};
