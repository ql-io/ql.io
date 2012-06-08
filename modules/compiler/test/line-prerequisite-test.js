/*
 * Copyright 2012 eBay Software Foundation
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

var compiler = require('../lib/compiler');

exports['single level select with where ='] = function(test) {
    var q = 'var2 = select * from details where id = "{^var1}";';
    var compiled = compiler.compile(q);
    test.equals(compiled.rhs.preRequisites.length, 1);
    test.equals(compiled.rhs.preRequisites[0], 'var1');
    test.done();
};

exports['single level select with where in'] = function(test) {
    var q = 'var2 = select * from details where id in ("{^var1}");';
    var compiled = compiler.compile(q);
    test.equal(compiled.rhs.preRequisites.length, 1);
    test.equal(compiled.rhs.preRequisites[0], 'var1');
    test.done();
};

exports['Two level select with where in select with ='] = function(test) {
    var q = 'var3 = select * from abcd where id in (select * from pqr where id = "{^var4}");';
    var compiled = compiler.compile(q);
    test.equal(compiled.rhs.preRequisites.length, 1);
    test.equal(compiled.rhs.preRequisites[0], 'var4');
    test.done();
};

exports['Two level select with where in select with in'] = function(test) {
    var q = 'var3 = select * from abcd where id in (select * from pqr where id in ("{^var4}"));';
    var compiled = compiler.compile(q);
    test.equal(compiled.rhs.preRequisites.length, 1);
    test.equal(compiled.rhs.preRequisites[0], 'var4');
    test.done();
};

exports['Multi-line Two level select with where = & in '] = function(test) {
    var q = 'var3 = select * from abcd where id in (select * from pqr where id in ("{^var4}"));\
        var5 = select * from abcd where id in (select * from pqr where id = "{^var6}");\
        return {"var3":"{var3}","var5":"{var5}"};';
    var compiled = compiler.compile(q);
    test.equal(compiled.rhs.dependsOn[0].preRequisites.length, 1);
    test.equal(compiled.rhs.dependsOn[0].preRequisites[0], 'var4');
    test.equal(compiled.rhs.dependsOn[1].preRequisites.length, 1);
    test.equal(compiled.rhs.dependsOn[1].preRequisites[0], 'var6');
    test.done();
};

exports['Three level select with in and ='] = function(test) {
    var q = 'var3 = select * from abcd where id in ' +
        '(select * from pqr where id in ( select * from xyz where id in ("{^var4}") and pid = "{^var6}") ' +
        'and pid = "{^var5}");';
    var compiled = compiler.compile(q);
    test.equal(compiled.rhs.type, 'select');
    test.equal(compiled.rhs.preRequisites.length, 3);
    test.equal(compiled.rhs.preRequisites[0], 'var4');
    test.equal(compiled.rhs.preRequisites[1], 'var6');
    test.equal(compiled.rhs.preRequisites[2], 'var5');
    test.done();
};

exports['Join in return'] = function(test) {
    var q = 'prodid = select ProductID[0].Value from ebay.shopping.products where QueryKeywords = "iphone" and siteid="0";\
             details = select * from ebay.shopping.productdetails where ProductID in ("{prodid}") and siteid=0 and ProductType = "Reference";\
             stats = select * from ebay.shopping.productstats where productID in ("{prodid}");\
             return select d.ProductID[0].Value as id, d.Title as title, d.DetailsURL as details, d.ReviewCount as reviewCount, d.StockPhotoURL as photo,\
        	        s.inventoryCountResponse as count\
                    from details as d, stats as s where s.productId = d.ProductID[0].Value and s.producId = "{^abcd}";';
    var compiled = compiler.compile(q);
    test.equal(compiled.rhs.type, 'select');
    test.equal(compiled.rhs.preRequisites.length, 1);
    test.equal(compiled.rhs.preRequisites[0], 'abcd');
    test.done();
};

exports['delete with in'] = function (test) {
    var q = "delete from ebay.item where itemId in ('{^abcd}') timeout 10 minDelay 100 maxDelay 10000";
    var compiled = compiler.compile(q);
    test.equals(compiled.rhs.preRequisites.length, 1);
    test.equals(compiled.rhs.preRequisites[0], 'abcd');
    test.done();
}

exports['delete with ='] = function (test) {
    var q = "delete from ebay.item where itemId = '{^abcd}' timeout 10 minDelay 100 maxDelay 10000";
    var compiled = compiler.compile(q);
    test.equals(compiled.rhs.preRequisites.length, 1);
    test.equals(compiled.rhs.preRequisites[0], 'abcd');
    test.done();
}
