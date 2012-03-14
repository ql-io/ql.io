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
    util = require('util'),
    express = require('express');

var Engine = require('../lib/engine');

var cooked = {
    selectstar:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                        '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse xmlns="http://www.ebay.com/marketplace/search/v1/services">' +
                        '<searchResult count="10">'+
                        '<item><itemId>140697152294</itemId>'+
                        '<title>New Sealed Apple iPad 2 16GB, Wi-Fi + 3G (Unlocked), 9.7in - White (MC982LL/A) </title></item>'+
                        '<item><itemId>320839939720</itemId>'+
                        '<title>Apple iPad 32GB, Wi-Fi + 3G (AT&amp;T), 9.7in - Black</title></item>'+
                        '</searchResult> </findItemsByKeywordsResponse>'
            }
        ],
        script: 'create table finditems on select get from "http://localhost:3000" '+
                'resultset "findItemsByKeywordsResponse.searchResult.item"; '+
                'web = select * from finditems where keywords = "ipad";'+
                'return "{web}"',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.ok(false,'got error: ' + err.stack || err);
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(!_.isArray(result.body[0]), 'expected object in the array');
                }
            }
        }
    },
    selectstarport:{
        ports: [
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify({'message' : 'ok'})
            }
        ],
        script: 'create table finditems on select get from "http://localhost:3026" '+
                'resultset "findItemsByKeywordsResponse"; ',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.ok(false,'got error: ' + err.stack || err);
                }
                else {
                    test.ok((result.body), { message: 'ok' });
                }
            }
        }
    },
    selectsome:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                        '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse>' +
                        '<item><itemId>220944750971</itemId>'+
                        '<title>Mini : Clubman S 2011 MINI COOPER S CLUBMAN*CONVENIENCE PKG,PREMIUM PKG,XENON LIGHTS=SWEET RIDE</title>'+
                        '<primaryCategory><categoryName>Clubman</categoryName> </primaryCategory>'+
                        '<sellingStatus> <currentPrice currencyId="USD">16000.0</currentPrice></sellingStatus></item>'+
                        '</findItemsByKeywordsResponse>'
            }
        ],
        script: 'create table finditems1 on select get from "http://localhost:3000"' +
                'resultset "findItemsByKeywordsResponse.item"; ' +
                'web= select title, itemId, primaryCategory.categoryName,sellingStatus.currentPrice from finditems1 where keywords="cooper" and FreeShippingOnly = "true" and MinPrice = "100" ;'+
                'return "{web}"',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(_.isArray(result.body[0]), 'expected array in the array');
                    test.equals(4, result.body[0].length, 'expected four fields');
                }
            }
        }

    },
    selectsomealiases: {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                        '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse>' +
                        '<item><itemId>220944750971</itemId>'+
                        '<title>Mini : Clubman S 2011 MINI COOPER S CLUBMAN*CONVENIENCE PKG,PREMIUM PKG,XENON LIGHTS=SWEET RIDE</title>'+
                        '<primaryCategory><categoryName>Clubman</categoryName> </primaryCategory>'+
                        '<sellingStatus> <currentPrice currencyId="USD">16000.0</currentPrice></sellingStatus></item>'+
                        '</findItemsByKeywordsResponse>'
            }
        ],
        script: 'create table finditems1 on select get from "http://localhost:3000"' +
                'resultset "findItemsByKeywordsResponse.item" ' +
                'web = select title as title, itemId as id, primaryCategory.categoryName as cat, sellingStatus.currentPrice as price from finditems1 where keywords="cooper" and FreeShippingOnly = "true" and MinPrice = "100" limit 10 offset 20'+
                'return "{web}"',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(util.inspect(err,false,null));
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(_.isObject(result.body[0]), 'expected object in the array');
                    test.ok(result.body[0].title);
                    test.ok(result.body[0].id);
                    test.ok(result.body[0].cat);
                    test.ok(result.body[0].price);

                }
            }
        }
    },
    nestedselection:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                        '<?xml version="1.0"?>'+
                        '<findItemsByKeywordsResponse >'+
                        '<item><primaryCategory><categoryId>171485</categoryId></primaryCategory></item>'+
                        '</findItemsByKeywordsResponse>'
            },
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                    '<?xml version="1.0"?>'+
                    '<findItemsByCategoryResponse>'+
                    '<item><itemId>250987484343</itemId>'+
                    '<title>Skytex Skypad SX-SP700A 4GB, Wi-Fi, Android v2.3 7in - Black </title>'+
                    '<primaryCategory><categoryId>171485</categoryId></primaryCategory></item>'+
                    '</findItemsByCategoryResponse>'
            }
        ],
        script: 'create table finditems on select get from "http://localhost:3000"'+
                'resultset "findItemsByKeywordsResponse.item";'+
                'create table findcategoryitems on select get from "http://localhost:3026"'+
                'resultset "findItemsByCategoryResponse.item";'+
                'select itemId, title from findcategoryitems where categoryId in (select primaryCategory.categoryId from finditems where keywords="ipad" limit 1) and zip = "98074" and distance = "10"',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(_.isArray(result.body[0]), 'expected array in the array');
                    test.equals(2, result.body[0].length, 'expected two fields');

                }
            }
        }
    },
    equalsreplace:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                        '<?xml version="1.0"?>'+
                        '<findItemsByKeywordsResponse >'+
                        '<item><itemId>270906634850</itemId></item>'+
                        '</findItemsByKeywordsResponse>'
            },
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify(
                    {
                        "Item":
                            [
                                {"ItemID":"270906634850","BuyItNowAvailable":true,
                                    "ConvertedBuyItNowPrice":
                                    {
                                        "Value":2.75,
                                        "CurrencyID":"USD"},
                                    "EndTime":"2012-02-10T19:03:54.000Z",
                                    "ViewItemURLForNaturalSearch":"http://www.ebay.com/itm/2011-Hot-Wheels-Ferrari-California-Black-HTF-/270906634850",
                                    "ListingType":"Chinese",
                                    "Location":"Greenwood lake, NY",
                                    "GalleryURL":"http://thumbs3.ebaystatic.com/pict/2709066348508080_1.jpg",
                                    "PictureURL":["http://i.ebayimg.com/00/s/NDgwWDY0MA==/$(KGrHqZ,!p!E8VkrBh00BPLC9Q4s8Q~~60_1.JPG?set_id=8800005007"],
                                    "PrimaryCategoryID":"223",
                                    "PrimaryCategoryName":"Toys & Hobbies:Diecast & Toy Vehicles:Cars, Trucks & Vans:Diecast-Modern Manufacture",
                                    "BidCount":0,
                                    "ConvertedCurrentPrice":
                                    {
                                        "Value":2.5,
                                        "CurrencyID":"USD"
                                    },
                                    "ListingStatus":"Active",
                                    "TimeLeft":"PT8M42S",
                                    "Title":"2011 Hot Wheels Ferrari California Black HTF",
                                    "Country":"US",
                                    "AutoPay":false,
                                    "ConditionID":1000,
                                    "ConditionDisplayName":"New"
                                }
                            ]
                    }
                )

            }
        ],
        script: 'create table finditems on select get from "http://localhost:3000"'+
                'resultset "findItemsByKeywordsResponse.searchResult.item";'+
                'create table shoppingitems on select get from "http://localhost:3026"'+
                'resultset "Item"'+
                'itemId = select itemId from finditems where keywords = "ferrari" limit 1'+
                'details = select * from shoppingitems where itemId = "{itemId}"'+
                'return {"details" : "{details}"}',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'JSON expected');
                    test.ok(result.body.details);
                }
            }
        }

    },
    selectdigits:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                        '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse>' +
                        '<item><itemId>280817533910</itemId>'+
                        '<title>Dap DRYDEX WALL REPAIR KIT 12345</title></item>'+
                        '<item><itemId>180812214303</itemId>'+
                        '<title>ROCKY 12345 VHS BOX SET VERY GOOD CONDITION</title></item>'+
                        '</findItemsByKeywordsResponse>'
            }
        ],
        script: 'create table finditems on select get from "http://localhost:3000"'+
                'resultset "findItemsByKeywordsResponse.item";'+
                'select * from finditems where keywords = 12345',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(!_.isArray(result.body[0]), 'expected object in the array');

                }
            }
        }
    },
    selectalias:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:
                    JSON.stringify(
                        {
                            "ItemID":"280817533910",
                            "Title":"Dap DRYDEX WALL REPAIR KIT 12345"
                        },
                        {
                            "ItemID":"180812214303",
                            "Title":"ROCKY 12345 VHS BOX SET VERY GOOD CONDITION"
                        }
                    )
            }
        ],
        script: 'create table finditems on select get from "http://localhost:3000"'+
                'data = select * from finditems where keywords = 12345'+
                'return select ItemID as id, Title as t from data;',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                }
                else {
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(_.isObject(result.body[0]), 'expected object in the array');
                    test.ok(result.body[0].id);
                    test.ok(result.body[0].t);
                }
            }
        }
    },
    subselect: {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:  JSON.stringify(  [
                    {
                        "ItemID":"270898130171",
                        "Title": "ipad black"
                    },
                    {
                        "ItemID":"330682531497",
                        "Title": "ipad white"
                    } ]
                )
            },
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify( [
                    {
                        "ItemID":"270898130171",
                        "Location":"Clearwater, Florida"
                    },
                    {
                        "ItemID":"330682531497",
                        "Location":"Not Specified"
                    }
                ]
                )
            }
        ],
        script: 'create table first on select get from "http://localhost:3000"'+
                'create table second on select get from "http://localhost:3026"'+
                'Resp1 = select ItemID from first '+
                'return select Location from second where ItemID in (select ItemID from first)',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.equals(2, result.body.length, 'expected 2 locations');

                }
            }
        }
    },
    inand : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:  JSON.stringify(  [
                    {
                        "ItemID":"270898130171",
                        "Title": "ipad black"
                    },
                    {
                        "ItemID":"330682531497",
                        "Title": "ipad white"
                    } ]
                )
            }
        ],
        script: 'create table first on select get from "http://localhost:3000"\r\n'+
                'create table second on select get from "http://localhost:3026?ItemID={^ItemID}&Shipping={^Shipping}"\r\n'+
                'return select Location from second where ItemID in (select ItemID from first) and Shipping = "yes"\r\n',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'JSON expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.equals(2, result.body.length, 'expected 2 items');
                    test.equals(result.body[0], 'Clearwater, Florida');
                    test.ok(result.body[1], 'San jose,California');
                }
            },
            setup: function (cb) {

                var resultDictionary = {
                    "270898130171:yes":[
                        {
                            "ItemID":"270898130171",
                            "Location":"Clearwater, Florida",
                            "Shipping":"yes"
                        }
                    ],
                    "330682531497:yes":[
                        {
                            "ItemID":"330682531497",
                            "Location":"San jose,California",
                            "Shipping":"yes"
                        }
                    ],
                    "330682531497:no":[
                        {
                            "ItemID":"330682531498",
                            "Location":"Austin, Texas",
                            "Shipping":"no"
                        }
                    ]};

                var server = express.createServer(function (req, res) {
                    var data;
                    data = resultDictionary[req.query.ItemID + ':' + req.query.Shipping] || [];
                    res.send(data);
                });
                server.listen(3026, function () {
                    cb({server:server});
                });
            },
            tearDown : function(cb, ctx){
                ctx.server.close();
                cb();
            }
        }
    },
    selectwithincomments : {
        ports : [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify(
                       [
                            {
                                "ItemID":"230747343910"
                            },
                            {
                                "ItemID":"230747343911"
                            }]
                )
            }
        ],
        script :  '--blah \n'+
            '--blah \n'+
            'create table first on select get from "http://localhost:3000" '+
            'return select * from first'+
            '-- blah',
        udf : {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    result = result.body;
                    test.ok(result.length > 0, 'expected some items');

                }
            }
        }
    },
    selectincsv : {
        ports: [
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify( [
                    {
                        "ItemID":"270898130171",
                        "Location":"Clearwater, Florida"
                    },
                    {
                        "ItemID":"330682531497",
                        "Location":"Not Specified"
                    }
                ]
                )
            }
        ],
        script: 'create table second on select get from "http://localhost:3026"'+
                'return select Location from second where ItemID in ("270898130171","330682531497")',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.equals(2, result.body.length, 'expected 2 locations');

                }
            }
        }

    }


}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});