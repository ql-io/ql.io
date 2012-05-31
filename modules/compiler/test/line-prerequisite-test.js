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
//    var q = 'var2 = select * from details where id = "{^var1}";\
//    var3 = select * from abcd where id in (select * from pqr where id = "{^var4}");\
//    return "{var3}";';
    //console.log(require('util').inspect(compiled,false,null));

    var q = 'var2 = select * from details where id = "{^var1}";';
    var compiled = compiler.compile(q);
    var obj = [ { type: 'select',
        line: 1,
        fromClause: [ { name: 'details' } ],
        columns: { name: '*', type: 'column' },
        whereCriteria:
            [ { operator: '=',
                lhs: { type: 'column', name: 'id' },
                rhs: { value: '{var1}' } } ],
        assign: 'var2',
        id: 0,
        preRequisites: [ 'var1' ] } ];
    test.deepEqual(compiled, obj);
    test.done();
};

exports['single level select with where in'] = function(test) {
    var q = 'var2 = select * from details where id in ("{^var1}");';
    var compiled = compiler.compile(q);
    var obj = [ { type: 'select',
        line: 1,
        fromClause: [ { name: 'details' } ],
        columns: { name: '*', type: 'column' },
        whereCriteria:
            [ { operator: 'in',
                lhs: { name: 'id' },
                rhs: { value: [ '{var1}' ] } } ],
        assign: 'var2',
        id: 0,
        preRequisites: [ 'var1' ] } ];
    test.deepEqual(compiled, obj);
    test.done();
};

exports['Two level select with where in select with ='] = function(test) {
    var q = 'var3 = select * from abcd where id in (select * from pqr where id = "{^var4}");';
    var compiled = compiler.compile(q);
    var obj = [ { type: 'select',
        line: 1,
        fromClause: [ { name: 'abcd' } ],
        columns: { name: '*', type: 'column' },
        whereCriteria:
            [ { operator: 'in',
                lhs: { name: 'id' },
                rhs:
                { type: 'select',
                    line: 1,
                    fromClause: [ { name: 'pqr' } ],
                    columns: { name: '*', type: 'column' },
                    whereCriteria:
                        [ { operator: '=',
                            lhs: { type: 'column', name: 'id' },
                            rhs: { value: '{var4}' } } ],
                    preRequisites: [ 'var4' ] } } ],
        assign: 'var3',
        id: 0 } ];
    test.deepEqual(compiled, obj);
    test.done();
};

exports['Two level select with where in select with in'] = function(test) {
    var q = 'var3 = select * from abcd where id in (select * from pqr where id in ("{^var4}"));';
    var compiled = compiler.compile(q);
    var obj = [ { type: 'select',
        line: 1,
        fromClause: [ { name: 'abcd' } ],
        columns: { name: '*', type: 'column' },
        whereCriteria:
            [ { operator: 'in',
                lhs: { name: 'id' },
                rhs:
                { type: 'select',
                    line: 1,
                    fromClause: [ { name: 'pqr' } ],
                    columns: { name: '*', type: 'column' },
                    whereCriteria:
                        [ { operator: 'in',
                            lhs: { name: 'id' },
                            rhs: { value: [ '{var4}' ] } } ],
                    preRequisites: [ 'var4' ] } } ],
        assign: 'var3',
        id: 0 } ];
    test.deepEqual(compiled, obj);
    test.done();
};

exports['Multi-line Two level select with where = & in '] = function(test) {
    var q = 'var3 = select * from abcd where id in (select * from pqr where id in ("{^var4}"));\
        var5 = select * from abcd where id in (select * from pqr where id = "{^var6}");\
        return {"var3":"{var3}","var5":"{var5}"};';
    var compiled = compiler.compile(q);
    var obj = [ { type: 'select',
        line: 1,
        fromClause: [ { name: 'abcd' } ],
        columns: { name: '*', type: 'column' },
        whereCriteria:
            [ { operator: 'in',
                lhs: { name: 'id' },
                rhs:
                { type: 'select',
                    line: 1,
                    fromClause: [ { name: 'pqr' } ],
                    columns: { name: '*', type: 'column' },
                    whereCriteria:
                        [ { operator: 'in',
                            lhs: { name: 'id' },
                            rhs: { value: [ '{var4}' ] } } ],
                    preRequisites: [ 'var4' ] } } ],
        assign: 'var3',
        id: 0,
        dependsOn: [],
        listeners: [ 2 ] },
        { type: 'select',
            line: 1,
            fromClause: [ { name: 'abcd' } ],
            columns: { name: '*', type: 'column' },
            whereCriteria:
                [ { operator: 'in',
                    lhs: { name: 'id' },
                    rhs:
                    { type: 'select',
                        line: 1,
                        fromClause: [ { name: 'pqr' } ],
                        columns: { name: '*', type: 'column' },
                        whereCriteria:
                            [ { operator: '=',
                                lhs: { type: 'column', name: 'id' },
                                rhs: { value: '{var6}' } } ],
                        preRequisites: [ 'var6' ] } } ],
            assign: 'var5',
            id: 1,
            dependsOn: [],
            listeners: [ 2 ] },
        { type: 'return',
            line: 1,
            id: 2,
            rhs:
            { object: { var3: '{var3}', var5: '{var5}' },
                type: 'define',
                line: 1 },
            dependsOn: [ 0, 1 ],
            listeners: [] } ];
    test.deepEqual(compiled, obj);
    test.done();
};

exports['Three level select with in and ='] = function(test) {
    var q = 'var3 = select * from abcd where id in ' +
        '(select * from pqr where id in ( select * from xyz where id in ("{^var4}") and pid = "{^var6}") ' +
        'and pid = "{^var5}");';
    var compiled = compiler.compile(q);
    var obj = [ { type: 'select',
        line: 1,
        fromClause: [ { name: 'abcd' } ],
        columns: { name: '*', type: 'column' },
        whereCriteria:
            [ { operator: 'in',
                lhs: { name: 'id' },
                rhs:
                { type: 'select',
                    line: 1,
                    fromClause: [ { name: 'pqr' } ],
                    columns: { name: '*', type: 'column' },
                    whereCriteria:
                        [ { operator: 'in',
                            lhs: { name: 'id' },
                            rhs:
                            { type: 'select',
                                line: 1,
                                fromClause: [ { name: 'xyz' } ],
                                columns: { name: '*', type: 'column' },
                                whereCriteria:
                                    [ { operator: 'in',
                                        lhs: { name: 'id' },
                                        rhs: { value: [ '{var4}' ] } },
                                        { operator: '=',
                                            lhs: { type: 'column', name: 'pid' },
                                            rhs: { value: '{var6}' } } ],
                                preRequisites: [ 'var4', 'var6' ] } },
                            { operator: '=',
                                lhs: { type: 'column', name: 'pid' },
                                rhs: { value: '{var5}' } } ],
                    preRequisites: [ 'var5' ] } } ],
        assign: 'var3',
        id: 0 } ];
    test.deepEqual(compiled, obj);
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
    var obj = [ { type: 'select',
        line: 1,
        fromClause: [ { name: 'ebay.shopping.products' } ],
        columns: [ { type: 'column', name: 'ProductID[0].Value' } ],
        whereCriteria:
            [ { operator: '=',
                lhs: { type: 'column', name: 'QueryKeywords' },
                rhs: { value: 'iphone' } },
                { operator: '=',
                    lhs: { type: 'column', name: 'siteid' },
                    rhs: { value: '0' } } ],
        assign: 'prodid',
        id: 0,
        dependsOn: [],
        listeners: [ 1, 2 ] },
        { type: 'select',
            line: 1,
            fromClause: [ { name: 'ebay.shopping.productdetails' } ],
            columns: { name: '*', type: 'column' },
            whereCriteria:
                [ { operator: 'in',
                    lhs: { name: 'ProductID' },
                    rhs: { value: [ '{prodid}' ] } },
                    { operator: '=',
                        lhs: { type: 'column', name: 'siteid' },
                        rhs: { value: 0 } },
                    { operator: '=',
                        lhs: { type: 'column', name: 'ProductType' },
                        rhs: { value: 'Reference' } } ],
            assign: 'details',
            id: 1,
            dependsOn: [ 0 ],
            listeners: [ ] },
        { type: 'select',
            line: 1,
            fromClause: [ { name: 'ebay.shopping.productstats' } ],
            columns: { name: '*', type: 'column' },
            whereCriteria:
                [ { operator: 'in',
                    lhs: { name: 'productID' },
                    rhs: { value: [ '{prodid}' ] } } ],
            assign: 'stats',
            id: 2,
            dependsOn: [ 0 ],
            listeners: [ ] },
        { type: 'return',
            line: 1,
            id: 3,
            rhs:
            { type: 'select',
                line: 1,
                columns:
                    [ { type: 'column', name: 'd.ProductID[0].Value', alias: 'id' },
                        { type: 'column', name: 'd.Title', alias: 'title' },
                        { type: 'column', name: 'd.DetailsURL', alias: 'details' },
                        { type: 'column', name: 'd.ReviewCount', alias: 'reviewCount' },
                        { type: 'column', name: 'd.StockPhotoURL', alias: 'photo' } ],
                selected:
                    [ { from: 'main', name: 'id' },
                        { from: 'main', name: 'title' },
                        { from: 'main', name: 'details' },
                        { from: 'main', name: 'reviewCount' },
                        { from: 'main', name: 'photo' },
                        { from: 'joiner', name: 'count' } ],
                extras: [],
                whereCriteria: [],
                fromClause: [ { name: '{details}', alias: 'd' } ],
                joiner:
                { type: 'select',
                    line: 1,
                    columns:
                        [ { type: 'column',
                            name: 's.inventoryCountResponse',
                            alias: 'count' },
                            { name: 's.productId', type: 'column', alias: '.productId' } ],
                    extras: [ 1 ],
                    whereCriteria:
                        [ { operator: '=',
                            lhs: { type: 'column', name: 's.productId' },
                            rhs:
                            { type: 'alias',
                                value: 'd.ProductID[0].Value',
                                joiningColumn: 'id' } },
                            { operator: '=',
                                lhs: { type: 'column', name: 's.producId' },
                                rhs: { value: '{abcd}' } } ],
                    fromClause: [ { name: '{stats}', alias: 's' } ],
                    preRequisites: [ 'abcd' ] },
                dependsOn: [ 1, 2 ],
                listeners: [] },
            dependsOn: [],
            listeners: [] } ];
    test.deepEqual(compiled, obj);
    test.done();
};

exports['delete with in'] = function (test) {
    var q = "delete from ebay.item where itemId in ('{^abcd}') timeout 10 minDelay 100 maxDelay 10000";
    var compiled = compiler.compile(q);
    var obj = [ { type: 'delete',
        source: { name: 'ebay.item' },
        whereCriteria:
            [ { operator: 'in',
                lhs: { name: 'itemId' },
                rhs: { value: [ '{abcd}' ] } } ],
        line: 1,
        timeout: 10,
        minDelay: 100,
        maxDelay: 10000,
        id: 0,
        preRequisites: [ 'abcd' ] } ];
    test.deepEqual(compiled, obj);
    test.done();
}

exports['delete with ='] = function (test) {
    var q = "delete from ebay.item where itemId = '{^abcd}' timeout 10 minDelay 100 maxDelay 10000";
    var compiled = compiler.compile(q);
    var obj = [ { type: 'delete',
        source: { name: 'ebay.item' },
        whereCriteria:
            [ { operator: '=',
                lhs: { type: 'column', name: 'itemId' },
                rhs: { value: '{abcd}' } } ],
        line: 1,
        timeout: 10,
        minDelay: 100,
        maxDelay: 10000,
        id: 0,
        preRequisites: [ 'abcd' ] } ];
    test.deepEqual(compiled, obj);
    test.done();
}
