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
    'compile-script': function(test) {
        var script = '-- Get myeBayBuying\n \
                    GetMyeBayBuyingResponse = select *\
                        from ebay.getmyebaybuying;\n\
                    \n\
                    -- Get myeBaySelling\n\
                    GetMyeBaySellingResponse = select * from ebay.getmyebayselling;\n\
                    \n\
                    -- Extract sub-lists\n\
                    watchList = select WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                    bidList = select BidList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                    bestOfferList = select BestOfferList.ItemArray.Item from GetMyeBayBuyingResponse;\n\
                    activeList = select ActiveList.ItemArray.Item from GetMyeBaySellingResponse;\n\
                    return {};';

        var statements = compiler.compile(script);
        var code = [];
        _.each(statements, function(s) {
            if(s.type !== 'comment') {
                code.push(s);
            }
        });
        var e = [
            { type: 'select',
                line: 2,
                fromClause: [
                    { name: 'ebay.getmyebaybuying' }
                ],
                columns: {name: '*', type: 'column'},
                whereCriteria: undefined,
                assign: 'GetMyeBayBuyingResponse',
                id: 0,
                dependsOn: [],
                listeners: [ 2, 3, 4 ] },
            { type: 'select',
                line: 5,
                fromClause: [
                    { name: 'ebay.getmyebayselling' }
                ],
                columns: {name: '*', type: 'column'},
                whereCriteria: undefined,
                assign: 'GetMyeBaySellingResponse',
                id: 1,
                dependsOn: [],
                listeners: [ 5 ] },
            { type: 'select',
                line: 8,
                fromClause: [
                    { name: '{GetMyeBayBuyingResponse}' }
                ],
                columns: [ {name: 'WatchList.ItemArray.Item', type: 'column'}],
                whereCriteria: undefined,
                assign: 'watchList',
                id: 2,
                dependsOn: [ 0 ],
                listeners: [] },
            { type: 'select',
                line: 9,
                fromClause: [
                    { name: '{GetMyeBayBuyingResponse}' }
                ],
                columns: [{name: 'BidList.ItemArray.Item', type: 'column'}],
                whereCriteria: undefined,
                assign: 'bidList',
                id: 3,
                dependsOn: [ 0 ],
                listeners: [] },
            { type: 'select',
                line: 10,
                fromClause: [
                    { name: '{GetMyeBayBuyingResponse}' }
                ],
                columns: [{name: 'BestOfferList.ItemArray.Item', type: 'column'}],
                whereCriteria: undefined,
                assign: 'bestOfferList',
                id: 4,
                dependsOn: [ 0 ],
                listeners: [] },
            { type: 'select',
                line: 11,
                fromClause: [
                    { name: '{GetMyeBaySellingResponse}' }
                ],
                columns: [{name: 'ActiveList.ItemArray.Item', type: 'column'}],
                whereCriteria: undefined,
                assign: 'activeList',
                id: 5,
                dependsOn: [ 1 ],
                listeners: [] },
            { rhs: {
                object: {},
                type: 'define',
                line: 12
            },
                type: 'return',
                line: 12,
                id: 6,
                dependsOn: [],
                listeners: [] }
        ];
        test.deepEqual(code, e);
        test.done();
    },
    'select-script': function(test) {
        var q = 'a = select * from foo;\n\
results = select title[0],\n\
  itemId[0], primaryCategory[0].categoryName[0], sellingStatus[0].currentPrice[0]\n\
  from ebay.finding.items;\n\
return {};';
        var statement = compiler.compile(q);
        var code = [];
        _.each(statement, function(s) {
            if(s.type !== 'comment') {
                code.push(s);
            }
        });
        var e = [
            { type: 'select',
                line: 1,
                fromClause: [
                    { name: 'foo' }
                ],
                columns: {name: '*', type: 'column'},
                whereCriteria: undefined,
                assign: 'a',
                id: 0,
                dependsOn: [],
                listeners: [] },
            { type: 'select',
                line: 2,
                fromClause: [
                    { name: 'ebay.finding.items' }
                ],
                columns:
                    [ {name: 'title[0]', type: 'column'},
                      {name: 'itemId[0]', type: 'column'},
                      {name: 'primaryCategory[0].categoryName[0]', type: 'column'},
                      {name: 'sellingStatus[0].currentPrice[0]', type: 'column'}],
                whereCriteria: undefined,
                assign: 'results',
                id: 1,
                dependsOn: [],
                listeners: [] },
            { rhs: {
                object: {},
                type: 'define', line: 5
            },
                type: 'return',
                line: 5,
                id: 2,
                dependsOn: [],
                listeners: [] }
        ];
        test.deepEqual(code, e);
        test.done();
    },

    'select-dependencies-from': function(test) {
        var script, cooked, e;

        script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\
        watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\
        bidList = select GetMyeBayBuyingResponse.BidList.ItemArray.Item from GetMyeBayBuyingResponse;\
        bestOfferList = select GetMyeBayBuyingResponse.BestOfferList.ItemArray.Item from GetMyeBayBuyingResponse;\
        watches = select * from watchList;\
        return {\
          "itemDetails" : "{watches}"\
        };'

        e = [
            { type: 'select',
                line: 1,
                fromClause: [
                    { name: 'ebay.getmyebaybuying' }
                ],
                columns: {name: '*', type: 'column'},
                whereCriteria: undefined,
                assign: 'GetMyeBayBuyingResponse',
                id: 0,
                dependsOn: [],
                listeners: [ 1, 2, 3 ] },
            { type: 'select',
                line: 1,
                fromClause: [
                    { name: '{GetMyeBayBuyingResponse}' }
                ],
                columns: [ {name: 'GetMyeBayBuyingResponse.WatchList.ItemArray.Item', type: 'column'}],
                whereCriteria: undefined,
                assign: 'watchList',
                id: 1,
                dependsOn: [ 0 ],
                listeners: [ 4 ] },
            { type: 'select',
                line: 1,
                fromClause: [
                    { name: '{GetMyeBayBuyingResponse}' }
                ],
                columns: [ {name: 'GetMyeBayBuyingResponse.BidList.ItemArray.Item', type: 'column'}],
                whereCriteria: undefined,
                assign: 'bidList',
                id: 2,
                dependsOn: [ 0 ],
                listeners: [] },
            { type: 'select',
                line: 1,
                fromClause: [
                    { name: '{GetMyeBayBuyingResponse}' }
                ],
                columns: [ {name: 'GetMyeBayBuyingResponse.BestOfferList.ItemArray.Item', type: 'column'}],
                whereCriteria: undefined,
                assign: 'bestOfferList',
                id: 3,
                dependsOn: [ 0 ],
                listeners: [] },
            { type: 'select',
                line: 1,
                fromClause: [
                    { name: '{watchList}' }
                ],
                columns: {name: '*', type: 'column'},
                whereCriteria: undefined,
                assign: 'watches',
                id: 4,
                dependsOn: [ 1 ],
                listeners: [ 5 ] },
            { type: 'return',
                rhs: {
                    object: { itemDetails: '{watches}' },
                    type: 'define',
                    line: 1
                },
                line: 1,
                id: 5,
                dependsOn: [ 4 ],
                listeners: [] }
        ];

        cooked = compiler.compile(script);
        var code = [];
        _.each(cooked, function(s) {
            if(s.type !== 'comment') {
                code.push(s);
            }
        });

        test.deepEqual(code, e);
        test.done();
    },

    'select-dependencies-where-in': function(test) {
        var script, cooked, e;
        script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  itemDetails = select * from ebay.multipleitems where itemId in (watchList.ItemID.text.$);\
                  return {\
                    "itemDetails" : "{itemDetails}"\
                  };'

        cooked = compiler.compile(script);
        test.equals(cooked.length, 4, 'Expected 4 lines, but found ' + cooked.length + ' lines');
        test.equals(cooked[1].dependsOn[0], 0, 'Second line must depend on the first line');
        test.equals(cooked[2].dependsOn.length, 1, 'Third line must have at least one dependency');
        test.equals(cooked[2].dependsOn[0], 1, 'Third line must depend on the second line');
        test.equals(cooked[3].dependsOn[0], 2, 'Fourth line must depend on the third line');
        test.done();
    },

    'select-dependencies-where-eq': function(test) {
        var script, cooked, e;
        script = 'GetMyeBayBuyingResponse = select * from ebay.getmyebaybuying;\
                  watchList = select GetMyeBayBuyingResponse.WatchList.ItemArray.Item from GetMyeBayBuyingResponse;\
                  itemDetails = select * from ebay.multipleitems where itemId = "{watchList.ItemID.text.$";\
                  return {\
                    "itemDetails" : "{itemDetails}"\
                  };'

        cooked = compiler.compile(script);
        test.equals(cooked.length, 4, 'Expected 4 lines, but found ' + cooked.length + ' lines');
        test.equals(cooked[1].dependsOn[0], 0, 'Second line must depend on the first line');
        test.equals(cooked[2].dependsOn.length, 1, 'Third line must have at least one dependency');
        test.equals(cooked[2].dependsOn[0], 1, 'Third line must depend on the second line');
        test.equals(cooked[3].dependsOn[0], 2, 'Fourth line must depend on the third line');
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
            var code = [];
            _.each(cooked, function(s) {
                if(s.type !== 'comment') {
                    code.push(s);
                }
            });
            cooked = code;
            test.equals(cooked.length, 9, 'Expected 9 lines, but found ' + cooked.length + ' lines');
            test.equals(cooked[2].dependsOn[0], 0, 'watchList must depend on GetMyeBayBuyingResponse');
            test.equals(cooked[3].dependsOn[0], 0, 'bidList must depend on GetMyeBayBuyingResponse');
            test.equals(cooked[4].dependsOn[0], 0, 'bestOfferList must depend on GetMyeBayBuyingResponse');
            test.equals(cooked[5].dependsOn[0], 1, 'activeList must depend on GetMyeBaySellingResponse');
            test.equals(cooked[6].dependsOn[0], 2, 'itemDetails must depend on watchList');
            test.equals(cooked[6].dependsOn[1], 3, 'itemDetails must depend on bidList');
            test.equals(cooked[6].dependsOn[2], 4, 'itemDetails must depend on bestOfferList');
            test.equals(cooked[6].dependsOn[3], 5, 'itemDetails must depend on activeList');
            test.equals(cooked[7].dependsOn[0], 2, 'watches must depend on watchList');
            test.equals(cooked[7].dependsOn[1], 6, 'watches must depend on itemDetails');

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
            test.equals(cooked.length, 3, 'Expected 3 lines, but found ' + cooked.length + ' lines');
            test.equals(cooked[0].listeners.length, 1, 'ipads must have one listener');
            test.equals(cooked[0].listeners[0], 1, 'ipads must precede details');
            test.equals(cooked[1].dependsOn.length, 1, 'details must have a dependency');
            test.equals(cooked[1].dependsOn[0], 0, 'details must depend on ipads');
            test.equals(cooked[2].dependsOn.length, 1, 'return must have a dependency');
            test.equals(cooked[2].dependsOn[0], 1, 'return must depend on details');
            test.done();
        }
        catch(e) {
            console.log(e.stack);
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
            test.equals(cooked.length, 3, 'Expected 3 lines, but found ' + cooked.length + ' lines');
            test.equals(cooked[0].type, 'define');
            test.equals(cooked[1].type, 'select');
            test.equals(cooked[2].type, 'return');
            test.done();
        }
        catch(e) {
            test.fail(e);
            test.done();
        }
    },

    'comment-at-end': function(test) {
        var script = 'foo = select * from foo;\n\
                      return foo;\n\
                      -- a comment';
        var cooked;
        try {
            cooked = compiler.compile(script);
            test.equals(cooked.length, 3);
            test.equals(cooked[2].type, 'comment');
            test.equals(cooked[2].text, 'a comment');
            test.done();
        }
        catch(e) {
            console.log(e.stack);
            test.fail(e);
            test.done();
        }
    },

    'crlf-at-end': function(test) {
        var script = 'foo = select * from foo;\n\
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
            test.equals(cooked.length, 6);
            test.equals(cooked[5].type, 'comment');
            test.equals(cooked[5].text, 'a comment');
            test.done();
        }
        catch(e) {
            console.log(e.stack);
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
        return j';
        var cooked;
        var res = [1, 1, -1, 1.234, -1.234, 1, 10, 10, 0.1, 0.01];
        cooked = compiler.compile(script);
        for(var i = 0; i < i.length; i++) {
            test.equals(cooked[i].type, 'define');
            test.equals(cooked[i].object, res[i]);
        }
        test.done();
    }
};
