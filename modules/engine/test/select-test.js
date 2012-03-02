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

var _    = require('underscore');

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
                        '<item><itemId>120854322916</itemId>'+
                        '<title>COOPER CROUSE HINDS APJ6485 ARKTITE PLUG RECEPTACLE PIN SLEEVE 600V 60A 3W 43632</title>' +
                        '<primaryCategory><categoryName>Receptacles &amp; Outlets</categoryName></primaryCategory>'+
                        '<sellingStatus><currentPrice currencyId="USD">169.99</currentPrice></sellingStatus></item>'+
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

    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});