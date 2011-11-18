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
    sys = require('sys');

module.exports = {
    'select-join-alias-remote': function(test) {
        var q = 'select e.Title as title, e.ItemID as id, g.geometry.location as latlng, e.Location as loc from ebay.shopping.item as e, google.geocode as g where\
                  e.itemId in (select itemId from ebay.finding.items where keywords = "mini")\
                  and e.Location = g.address';
        var cooked = compiler.compile(q);
        test.equals(cooked[0].joiner.whereCriteria[0].rhs.type, 'alias');
        test.equals(cooked[0].joiner.whereCriteria[0].rhs.value, 'e.Location');
        test.equals(cooked[0].joiner.whereCriteria[0].rhs.joiningColumn, 'loc');
        test.done();
    },

    'select-join-alias-local': function(test) {
        var q = 'prodid = select ProductID[0].Value from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\
                 details = select * from ebay.shopping.productdetails where ProductID in ("{prodid}") and siteid=0 and ProductType = "Reference";\
                 stats = select * from ebay.shopping.productstats where productID in ("{prodid}");\
                return select d.ProductID[0].Value as id, d.Title as title, d.DetailsURL as details, d.ReviewCount as reviewCount, d.StockPhotoURL as photo,\
        	        s.inventoryCountResponse as count\
                    from details as d, stats as s where s.productId = d.ProductID[0].Value;';
        var cooked = compiler.compile(q);
        var statement = cooked[3].rhs;
        test.equals(statement.joiner.whereCriteria[0].rhs.type, 'alias');
        test.equals(statement.joiner.whereCriteria[0].rhs.value, 'd.ProductID[0].Value');
        test.equals(statement.joiner.whereCriteria[0].rhs.joiningColumn, 'id');
        test.done();
    }
}