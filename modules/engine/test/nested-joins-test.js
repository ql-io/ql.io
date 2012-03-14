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

var _    = require('underscore'),
    util = require('util');

var Engine = require('../lib/engine');

var cooked = {
    joinstest1 : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        "Item" : [{
                            "ItemId" : "12345"
                        }],
                        "OrderTransaction" : [{
                            "ItemId" : "67893"
                        }]
                    }
                )
            },
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {

                        "OrderTransaction" : [{
                            "ItemId" : "67893"
                        }]
                    }
                )
            },
            {
                port: 3028,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {"Item":
                        [{"ItemId" : "67893"},{"ItemId" : "12345"}]
                    }) }
        ],
        script: 'create table first on select get from "http://localhost:3000/"\r\n'+
                'create table second on select get from "http://localhost:3026/";\r\n'+
                'create table third on select get from "http://localhost:3028/";\r\n'+
                'fr1 = select * from first\r\n'+
                'sr1 = select * from second;\r\n'+
                'wonList = "{fr1.OrderTransaction}"\r\n'+
                'soldList = "{sr1.OrderTransaction}"\r\n'+
                'watchList = "{fr1.Item}";\r\n'+
                'unsoldList = "{sr1.Item}";\r\n'+
                'tr1 = select * from third\r\n'+
                'itemDetails = "{tr1.Item}";\r\n'+
                'won = select d.ItemId as itemId from wonList as w, itemDetails as d where w.ItemId = d.ItemId;\r\n'+
                'sold = select d.ItemId as itemId from soldList as s, itemDetails as d where s.ItemId = d.ItemId;\r\n'+
                'watches = select d.ItemId as itemId from watchList as w, itemDetails as d where w.ItemId = d.ItemId;\r\n'+
                'unsold = select d.ItemId as itemId from unsoldList as u,itemDetails as d where u.ItemId = d.ItemId;\r\n'+
                'return {                                                           '+
                '            "fr1": "{fr1}", '+
                '            "sr1": "{sr1}", '+
                '            "itemDetails": "{itemDetails}",                           '+
                '            "wonList": "{wonList}",                                   '+
                '            "soldList": "{soldList}",                                 '+
                '            "watchList": "{watchList}",                               '+
                '            "unsoldList": "{unsoldList}",                             '+
                '            "won": "{won}",                                           '+
                '            "sold": "{sold}",                                         '+
                '            "watches": "{watches}",                                   '+
                '            "unsold": "{unsold}" }                                    ',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {

                    result = result.body;
                    test.ok(result.fr1);
                    test.ok(result.sr1);
                    test.ok(result.itemDetails);
                    test.ok(result.wonList);
                    test.ok(result.soldList);
                    test.ok(result.watchList);
                    test.ok(!result.unsoldList);
                    test.ok(result.won);
                    test.ok(result.sold);
                    test.ok(result.watches);
                    test.ok(!result.unsold);

                    // itemDetails and soldList are arrays
                    test.ok(_.isArray(result.itemDetails));
                    test.ok(_.isArray(result.soldList));
                    test.ok(_.isArray(result.watchList));
                    test.ok(_.isArray(result.wonList));

                    // watchList and wonList are objects (due to XML-JSON conv)
                    test.ok(_.isObject(result.watchList));
                    test.ok(_.isObject(result.wonList));

//                    // Test contents
                    _.each(result.itemDetails, function(ItemId) {
                        test.ok(ItemId);
                        test.ok(isNumber(ItemId.ItemId));
                    });

                    test.ok(result.wonList);

                    test.equals(result.soldList.length, 1);

                    test.ok(result.watchList);
                    test.equals(result.won.length, 1);
                    test.equals(result.won[0].itemId, 67893);

                    test.equals(result.sold.length, 1);
                    _.each(result.sold, function(soldItem) {
                        test.ok(soldItem.itemId);
                    })

                    test.equals(result.watches.length, 1);
                    test.equals(result.watches[0].itemId, 12345);

                }
            }
        }
    }
}
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});