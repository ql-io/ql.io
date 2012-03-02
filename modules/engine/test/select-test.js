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

var util = require('util'),
    _    = require('underscore');

var cooked = {
    selectstar:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "soap+xml",
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
    }
}

module.exports = require('../node_modules/ql-unit/lib/unit').init({
    cooked: cooked
});