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
    select:{
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
                            '<item><itemId>270914934578</itemId></item>'+
                            '</searchResult> </findItemsByKeywordsResponse>'
                }
            ],
            script: 'create table mytable on select post to "http://foo.com" using defaults format = "JSON", globalid = "EBAY-US", currency = "USD", itemSearchScope = "",'+
                    'limit = 10, offset = 0, appid = "Qlio1a92e-fea5-485d-bcdb-1140ee96527"'+
                    'using patch "test/patches/select-patch.js"'+
                    'resultset "GetItemResponse.Item"'+
                    'create table finding.items on select get from "http://localhost:3000/"'+
                    'resultset "findItemsByKeywordsResponse.searchResult.item"'+
                    'itemId = select itemId from finding.items where keywords = "ferrari" limit 1;'+
                    'item = select * from mytable where itemId = "{itemId}";'+
                    'return {"itemId" : "{itemId}", "item" : "{item}" };',

            udf: {
                test : function (test, err, result) {
                    if(err) {
                        console.log(err.stack || err);
                        test.ok(false);
                    }
                    else if(result) {
                        test.equals(result.body.itemId, result.body.item.ItemID);
                    }
                }
            }
        },
    selectnourl:{
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
                        '<item><itemId>370586052229</itemId></item>'+
                        '</searchResult> </findItemsByKeywordsResponse>'
            }
        ],
        script: 'create table mytable.nourl on select post to "http://foo.com" using defaults format = "JSON", globalid = "EBAY-US", currency = "USD", itemSearchScope = "",'+
                'limit = 10, offset = 0, appid = "Qlio1a92e-fea5-485d-bcdb-1140ee96527"'+
                'using patch "test/patches/select-no-url-patch.js"'+
                'resultset "GetItemResponse.Item"'+
                'create table finding.items on select get from "http://localhost:3000/"'+
                'resultset "findItemsByKeywordsResponse.searchResult.item"'+
                'itemId = select itemId from finding.items where keywords = "ferrari" limit 1;'+
                'item = select * from mytable.nourl where itemId = "{itemId}";'+
                'return {"itemId" : "{itemId}", "item" : "{item}"};',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.ok(false);
                }
                else if(result) {
                    test.ok(true);
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
