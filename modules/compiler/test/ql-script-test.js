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
        var e = { type: 'return',
          line: 5,
          id: 2,
          rhs: { ref: 'results' },
          dependsOn:
           [ { type: 'select',
               line: 2,
               fromClause: [ { name: '{a}' } ],
               columns:
                [ { type: 'column', name: 'title[0]' },
                  { type: 'column', name: 'itemId[0]' },
                  { type: 'column', name: 'primaryCategory[0].categoryName[0]' },
                  { type: 'column', name: 'sellingStatus[0].currentPrice[0]' } ],
               whereCriteria: undefined,
               assign: 'results',
               id: 1,
               dependsOn:
                [ { type: 'select',
                    line: 1,
                    fromClause: [ { name: 'foo' } ],
                    columns: { name: '*', type: 'column' },
                    whereCriteria: undefined,
                    assign: 'a',
                    id: 0,
                    dependsOn: [] } ] } ] };
        test.deepEqual(statement, e);
        test.done();
    },

    'select-dependencies-from': function(test) {
        var script, cooked, e;

        script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\n\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                  bidList = select GetMyeBayBuyingResponse.BidList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                  bestOfferList = select GetMyeBayBuyingResponse.BestOfferList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                  watches = select * from watchList;\n\
                  return {\n\
                      "itemDetails" : "{watches}"\n\
                  };'

        e = { type: 'return',
          line: 6,
          id: 5,
          rhs: { object: { itemDetails: '{watches}' }, type: 'define', line: 6 },
          dependsOn:
           [ { type: 'select',
               line: 5,
               fromClause: [ { name: '{watchList}' } ],
               columns: { name: '*', type: 'column' },
               whereCriteria: undefined,
               assign: 'watches',
               id: 4,
               dependsOn:
                [ { type: 'select',
                    line: 2,
                    fromClause: [ { name: '{GetMyeBayBuyingResponse}' } ],
                    columns:
                     [ { type: 'column',
                         name: 'GetMyeBayBuyingResponse.WatchList.ItemArray.Item' } ],
                    whereCriteria: undefined,
                    assign: 'watchList',
                    id: 1,
                    dependsOn:
                     [ { type: 'select',
                         line: 1,
                         fromClause: [ { name: 'ebay.getmyebaybuying' } ],
                         columns: { name: '*', type: 'column' },
                         whereCriteria: undefined,
                         assign: 'GetMyeBayBuyingResponse',
                         id: 0,
                         dependsOn: [] } ] } ] } ] };

        cooked = compiler.compile(script);
        test.deepEqual(cooked, e);
        test.done();
    },

    'select-dependencies-where-in': function(test) {
        var script, cooked, e;
        script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  itemDetails = select * from ebay.multipleitems where itemId in "{watchList.ItemID.text.$}";\
                  return {\
                    "itemDetails" : "{itemDetails}"\
                  };'

        cooked = compiler.compile(script);
        test.equals(cooked.dependsOn[0].assign, 'itemDetails');
        test.equals(cooked.dependsOn[0].dependsOn[0].assign, 'watchList');
        test.equals(cooked.dependsOn[0].dependsOn[0].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
        test.done();
    },

    'select-dependencies-where-eq': function(test) {
        var script, cooked, e;
        script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  itemDetails = select * from ebay.multipleitems where itemId = "{watchList.ItemID.text.$}";\
                  return {\
                    "itemDetails" : "{itemDetails}"\
                  };'

        cooked = compiler.compile(script);
        test.equals(cooked.dependsOn[0].assign, 'itemDetails');
        test.equals(cooked.dependsOn[0].dependsOn[0].assign, 'watchList');
        test.equals(cooked.dependsOn[0].dependsOn[0].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
        test.done();
    },

    'select-dependencies-where-eq-complex': function(test) {
        var script, cooked, e;

        script = '-- Get myeBayBuying\n\
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
            cooked = compiler.compile(script);
            test.equals(cooked.dependsOn.length, 1);
            test.equals(cooked.dependsOn[0].dependsOn.length, 4);
            test.equals(cooked.dependsOn[0].dependsOn[0].assign, 'watchList');
            test.equals(cooked.dependsOn[0].dependsOn[0].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
            test.equals(cooked.dependsOn[0].dependsOn[1].assign, 'bidList');
            test.equals(cooked.dependsOn[0].dependsOn[1].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
            test.equals(cooked.dependsOn[0].dependsOn[2].assign, 'bestOfferList');
            test.equals(cooked.dependsOn[0].dependsOn[2].dependsOn[0].assign, 'GetMyeBayBuyingResponse');
            test.equals(cooked.dependsOn[0].dependsOn[3].assign, 'activeList');
            test.equals(cooked.dependsOn[0].dependsOn[3].dependsOn[0].assign, 'GetMyeBaySellingResponse');
            test.done();
        }
        catch(e) {
            console.log(e.stack);
            test.fail(e);
            test.done();
        }

    },

    'select-dependencies-in-clause': function(test) {
        var script, cooked, e;

        script = 'ipads = select itemId[0] from ebay.finding.items where keywords = "ipad" limit 10;\n\
                  details = select * from ebay.item where itemId in (select itemId[0] from ipads);\n\
                  return {\n\
                    "ipads" : "{details}"\n\
                  };'
        try {
            cooked = compiler.compile(script);
            test.equals(cooked.dependsOn.length, 1);
            test.equals(cooked.dependsOn[0].type, 'select');
            test.equals(cooked.dependsOn[0].dependsOn.length, 1);
            test.equals(cooked.dependsOn[0].dependsOn[0].type, 'select');
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.fail(e);
            test.done();
        }
    },

    'script-define' : function(test) {
        var script, cooked;
        script = 'data = {\
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
            cooked = compiler.compile(script);
            test.equals(cooked.type, 'return');
            test.equals(cooked.dependsOn.length, 1);
            test.equals(cooked.dependsOn[0].type, 'select')
            test.equals(cooked.dependsOn[0].dependsOn.length, 1);
            test.equals(cooked.dependsOn[0].dependsOn[0].type, 'define');
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
        var cooked;
        try {
            cooked = compiler.compile(script);
            test.equals(cooked.rhs.ref, 'foo');
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
        var cooked;
        try {
            cooked = compiler.compile(script);
            test.equals(cooked.rhs.ref, 'foo');
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
        var cooked;
        var res = [1, 1, -1, 1.234, -1.234, 1, 10, 10, 0.1, 0.01];
        cooked = compiler.compile(script);
        for(var i = 0; i < i.length; i++) {
            test.equals(cooked.dependsOn[i], 'define');
            test.equals(cooked.dependsOn[i].object, res[i]);
        }
        test.done();
    },

    'null-val': function(test) {
        var script = 'a = null';
        try {
            var cooked = compiler.compile(script);
            test.ok(cooked.rhs.object === null);
            test.equals(cooked.rhs.assign, 'a');
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
            var cooked = compiler.compile(script);
            test.equals(cooked.rhs.object, "Hello\"World");
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
            var cooked = compiler.compile(script);
            test.equals(cooked.rhs.object, 'Hello\'World');
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
        var cooked = compiler.compile(script);
        test.equals(cooked.rhs.columns[0].name, 'b-1');
        test.equals(cooked.rhs.columns[1].name, 'b-3[c-1]');
        test.done();
    },

    'circular-ref': function(test) {
        var script = 'foo = select * from foo;\n\
                      return foo;';
        var cooked;
        try {
            cooked = compiler.compile(script);
            test.ok(false, 'Not failed on circular ref');
            test.done();
        }
        catch(e) {
            test.ok(true);
            test.done();
        }
    }
};
