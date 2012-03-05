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
    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});