var compiler = require('lib/compiler'),
    sys = require('sys');

module.exports = {
    'select-star': function(test) {
        var q = "select * from foo";
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 1,
                fromClause: [
                    {'name': 'foo' }
                ],
                columns: {name: '*'},
                whereCriteria: undefined,
                id: 0,
                line: 1
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-some': function(test) {
        var q = 'select title[0], itemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] from ebay.finding.items';
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 1,
                fromClause: [
                    {'name': 'ebay.finding.items' }
                ],
                columns: [
                    {name: 'title[0]'},
                    {name: 'itemId[0]'},
                    {name: 'primaryCategory[0].categoryName[0]'},
                    {name: 'sellingStatus[0].currentPrice[0]'}
                ],
                whereCriteria: undefined,
                id: 0,
                line: 1
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-some-where': function(test) {
        var q = 'select title[0], itemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] from ebay.finding.items where keywords="cooper"';
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 1,
                fromClause: [
                    {name: 'ebay.finding.items' }
                ],
                columns: [
                    {name: 'title[0]'},
                    {name: 'itemId[0]'},
                    {name: 'primaryCategory[0].categoryName[0]'},
                    {name: 'sellingStatus[0].currentPrice[0]'}
                ],
                whereCriteria: [
                    { operator: '=', lhs: {name: 'keywords'}, rhs: {
                        value: 'cooper'
                    } }
                ],
                id: 0
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-alias': function(test) {
        var q = 'select e.title[0], e.itemId[0], e.primaryCategory[0].categoryName[0], ' +
            'e.sellingStatus[0].currentPrice[0] from ebay.finding.items as e where keywords="cooper"';
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 1,
                fromClause: [
                    {name: 'ebay.finding.items', alias: 'e' }
                ],
                columns: [
                    {name: 'e.title[0]'},
                    {name: 'e.itemId[0]'},
                    {name: 'e.primaryCategory[0].categoryName[0]'},
                    {name: 'e.sellingStatus[0].currentPrice[0]'}
                ],
                whereCriteria: [
                    { operator: '=', lhs: {name: 'keywords'}, rhs: {
                        value: 'cooper'
                    } }
                ],
                id: 0
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-in-csv': function(test) {
        var q = "select ViewItemURLForNaturalSearch from ebay.item where itemId in ('180652013910','120711247507')";
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 1,
                fromClause: [
                    {name: 'ebay.item'}
                ],
                columns: [
                    {name: 'ViewItemURLForNaturalSearch'}
                ],
                whereCriteria: [
                    { operator: 'in', lhs: {name: 'itemId'}, "rhs":{
                        value: ['180652013910', '120711247507']
                    }
                    }
                ],
                id: 0
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-join': function(test) {
        var q = "select e.Title, e.ItemID, g.geometry.location from ebay.item as e, google.geocode as g where e.itemId in \
            (select itemId from ebay.finding.items where keywords = 'mini') and g.address = e.Location"
        var statement = compiler.compile(q);
        var e = [
            {
                "type": "select",
                "line": 1,
                "columns": [
                    {name: "e.Title"},
                    {name: "e.ItemID"},
                    {name: "e.Location"}
                ],
                extras: [ 2 ],
                "selected": [
                    {
                        "from": "main",
                        "index": 0
                    },
                    {
                        "from": "main",
                        "index": 1
                    },
                    {
                        "from": "joiner",
                        "index": 0
                    }
                ],
                "whereCriteria": [
                    {
                        "operator": "in",
                        "lhs": {name: "e.itemId"},
                        "rhs": {
                            "type": "select",
                            "line": 1,
                            "fromClause": [
                                {
                                    "name": "ebay.finding.items"
                                }
                            ],
                            "columns": [
                                {name: "itemId"}
                            ],
                            "whereCriteria": [
                                {
                                    "operator": "=",
                                    "lhs": {name: "keywords"},
                                    "rhs": {
                                        "value": "mini"
                                    }
                                }
                            ]
                        }
                    }
                ],
                "fromClause": [
                    {
                        "name": "ebay.item",
                        "alias": "e"
                    }
                ],
                "joiner": {
                    "type": "select",
                    "columns": [
                        {name: "g.geometry.location"},
                        {name: "g.address"}
                    ],

                    "extras": [1],
                    "whereCriteria": [
                        {
                            "operator": "=",
                            "lhs": {name: "g.address"},
                            "rhs": {
                                "type": "alias",
                                "value": "e.Location",
                                "joiningColumn": 2
                            }
                        }
                    ],
                    "fromClause": [
                        {
                            "name": "google.geocode",
                            "alias": "g"
                        }
                    ]
                },
                "id": 0
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-limit': function(test) {
        var q = 'select title[0], itemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] from ebay.finding.items limit 4';
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 1,
                fromClause: [
                    {'name': 'ebay.finding.items' }
                ],
                columns: [
                    {name: 'title[0]'},
                    {name: 'itemId[0]'},
                    {name: 'primaryCategory[0].categoryName[0]'},
                    {name: 'sellingStatus[0].currentPrice[0]'}
                ],
                whereCriteria: undefined,
                limit: 4,
                id: 0
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-offset': function(test) {
        var q = 'select title[0], itemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] from ebay.finding.items limit 4 offset 2';
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 1,
                fromClause: [
                    {'name': 'ebay.finding.items' }
                ],
                columns: [
                    {name: 'title[0]'},
                    {name: 'itemId[0]'},
                    {name: 'primaryCategory[0].categoryName[0]'},
                    {name: 'sellingStatus[0].currentPrice[0]'}
                ],
                whereCriteria: undefined,
                limit: 4,
                offset: 2,
                id: 0
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'udf': function(test) {
        var q = 'select * from ebay.finditems where contains("mini cooper") and blendBy()';
        var statement = compiler.compile(q);
        var e = [
            {
                "type": "select",
                "line": 1,
                "fromClause": [
                    {
                        "name": "ebay.finditems"
                    }
                ],
                "columns": {name: "*"},
                "whereCriteria": [
                    {
                        "operator": "udf",
                        "name": "contains",
                        "args": [
                            {
                                "value": "mini cooper"
                            }
                        ]
                    },
                    {
                        "operator": "udf",
                        "name": "blendBy",
                        "args": ""
                    }
                ],
                id: 0
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'udf-bad': function(test) {
        var q = 'select * from ebay.finditems where contains("mini cooper") and blendBy';
        try {
            compiler.compile(q);
            test.fail('Missing () for the udf');
        }
        catch(e) {
            // expected
        }
        test.done();
    },

    'select-assign': function(test) {
        var q = 'results = select title[0], itemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] from ebay.finding.items; return {};';
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                fromClause: [
                    {'name': 'ebay.finding.items' }
                ],
                columns: [
                    {name: 'title[0]'},
                    {name: 'itemId[0]'},
                    {name: 'primaryCategory[0].categoryName[0]'},
                    {name: 'sellingStatus[0].currentPrice[0]'}
                ],
                whereCriteria: undefined,
                assign: 'results',
                id: 0,
                dependsOn: [],
                listeners: [],
                line: 1
            },
            {
                type: 'return',
                rhs: {
                    object : {},
                    type: 'define',
                    line: 1
                },
                id: 1,
                dependsOn: [],
                listeners: [],
                line: 1
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-crlf': function(test) {
        var q = 'select title[0], \nitemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] \nfrom ebay.finding.items';
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 3,
                fromClause: [
                    {'name': 'ebay.finding.items' }
                ],
                columns: [
                    {name: 'title[0]'},
                    {name: 'itemId[0]'},
                    {name: 'primaryCategory[0].categoryName[0]'},
                    {name: 'sellingStatus[0].currentPrice[0]'}
                ],
                whereCriteria: undefined,
                id: 0
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'comments': function(test) {
        var sys = require('sys');
        var q = '-- hello';
        var statement = compiler.compile(q);
        test.equals(statement.length, 1);
        q = '-- hello\n--hello again';
        statement = compiler.compile(q);
        test.equals(statement.length, 2);
        test.done();
    },

    'comment-single': function(test) {
        var q = '-- hello\nselect * from foo';
        var statement = compiler.compile(q);
        var e = [
            { line: 1,
                type: 'comment',
                text: 'hello',
                dependsOn: [],
                listeners: [] },
            { type: 'select',
                line: 2,
                fromClause: [
                    { name: 'foo' }
                ],
                columns: {name: '*'},
                whereCriteria: undefined,
                id: 0,
                dependsOn: [],
                listeners: [] }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'join-columns': function(test) {
        var q = 'select d.ItemId, w.ItemID, d.Title from watchList as w, itemDetails as d where w.ItemID = d.ItemId';
        var statement = compiler.compile(q)[0];
        test.equals(statement.columns.length, 1, 'Expecting one column, but found ' +
            statement.columns.length);
        test.equals(statement.columns[0].name, 'w.ItemID');
        test.equals(statement.joiner.columns.length, 2, 'Expecting two columns, but found ' +
            statement.joiner.columns.length);
        test.equals(statement.joiner.columns[0].name, 'd.ItemId');
        test.equals(statement.joiner.columns[1].name, 'd.Title');
        test.ok(statement.selected, 'Selected column list not found');
        test.equals(statement.selected.length, 3, 'Expected three columns to be selected');
        test.equals(statement.selected[0].from, 'joiner');
        test.equals(statement.selected[0].index, 0);
        test.equals(statement.selected[1].from, 'main');
        test.equals(statement.selected[1].index, 0);
        test.equals(statement.selected[2].from, 'joiner');
        test.equals(statement.selected[2].index, 1);
        test.done();
    },

    'select-compile-err': function(test) {
        var q = 'selecta title[0], itemId[0], primaryCategory[0].categoryName[0], ' +
            'sellingStatus[0].currentPrice[0] from ebay.finding.items limit 4';
        try {
            compiler.compile(q);
            test.ok(false, 'did not fail');
            test.done();
        }
        catch(e) {
            test.done();
        }
    },

    'select-join-removal-from-both': function(test) {
        var q = 'select p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.inventoryCountResponse from products as p, prodstats as ps where ps.productid = p.ProductID[0].Value';
        try {
            var cooked = compiler.compile(q);
            test.equal(cooked[0].type, 'select');
            test.equal(cooked[0].joiner.type, 'select');
            test.equal(cooked[0].joiner.whereCriteria[0].lhs.name, 'ps.productid');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.value, 'p.ProductID[0].Value');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.joiningColumn, 2);
            test.equal(cooked[0].extras.length, 1);
            test.equal(cooked[0].extras[0], 2);
            test.equal(cooked[0].joiner.extras.length, 1);
            test.equal(cooked[0].joiner.extras[0], 2);
            var selected = cooked[0].selected;
            test.equal(selected.length, 4);
            test.equal(selected[0].from, 'main');
            test.equal(selected[1].from, 'main');
            test.equal(selected[2].from, 'joiner');
            test.equal(selected[3].from, 'joiner');
            test.equal(selected[0].index, 0);
            test.equal(selected[1].index, 1);
            test.equal(selected[2].index, 0);
            test.equal(selected[3].index, 1);
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.ok(false, 'failed');
            test.done();
        }
    },

    'select-join-removal-from-main': function(test) {
        var q = 'select p.ProductID[0].Value, p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.inventoryCountResponse from products as p, prodstats as ps where ps.productid = p.ProductID[0].Value';
        try {
            var cooked = compiler.compile(q);
            test.equal(cooked[0].type, 'select');
            test.equal(cooked[0].joiner.type, 'select');
            test.equal(cooked[0].joiner.whereCriteria[0].lhs.name, 'ps.productid');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.value, 'p.ProductID[0].Value');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.joiningColumn, 0);
            test.equal(cooked[0].extras.length, 0);
            test.equal(cooked[0].joiner.extras.length, 1);
            test.equal(cooked[0].joiner.extras[0], 2);
            var selected = cooked[0].selected;
            test.equal(selected.length, 5);
            test.equal(selected[0].from, 'main');
            test.equal(selected[1].from, 'main');
            test.equal(selected[2].from, 'main');
            test.equal(selected[3].from, 'joiner');
            test.equal(selected[4].from, 'joiner');
            test.equal(selected[0].index, 0);
            test.equal(selected[1].index, 1);
            test.equal(selected[2].index, 2);
            test.equal(selected[0].index, 0);
            test.equal(selected[1].index, 1);
            test.done();
        }
        catch(e) {
            test.ok(false, 'failed');
            test.done();
        }
    },

    'select-join-removal-from-join': function(test) {
        var q = 'select p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.productid, ps.inventoryCountResponse from products as p, prodstats as ps where ps.productid = p.ProductID[0].Value';
        try {
            var cooked = compiler.compile(q);
            test.equal(cooked[0].type, 'select');
            test.equal(cooked[0].joiner.type, 'select');
            test.equal(cooked[0].joiner.whereCriteria[0].lhs.name, 'ps.productid');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.value, 'p.ProductID[0].Value');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.joiningColumn, 2);
            test.equal(cooked[0].extras.length, 1);
            test.equal(cooked[0].extras[0], 2);
            test.equal(cooked[0].joiner.extras.length, 0);
            var selected = cooked[0].selected;
            test.equal(selected.length, 5);
            test.equal(selected[0].from, 'main');
            test.equal(selected[1].from, 'main');
            test.equal(selected[2].from, 'joiner');
            test.equal(selected[3].from, 'joiner');
            test.equal(selected[4].from, 'joiner');
            test.equal(selected[0].index, 0);
            test.equal(selected[1].index, 1);
            test.equal(selected[2].index, 0);
            test.equal(selected[3].index, 1);
            test.equal(selected[4].index, 2);
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.ok(false, 'failed');
            test.done();
        }
    },

    'select-join-removal-from-both-flip': function(test) {
        var q = 'select p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.inventoryCountResponse from products as p, prodstats as ps where p.ProductID[0].Value = ps.productid';
        try {
            var cooked = compiler.compile(q);
            test.equal(cooked[0].type, 'select');
            test.equal(cooked[0].joiner.type, 'select');
            test.equal(cooked[0].joiner.whereCriteria[0].lhs.name, 'ps.productid');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.value, 'p.ProductID[0].Value');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.joiningColumn, 2);
            test.equal(cooked[0].extras.length, 1);
            test.equal(cooked[0].extras[0], 2);
            test.equal(cooked[0].joiner.extras.length, 1);
            test.equal(cooked[0].joiner.extras[0], 2);
            var selected = cooked[0].selected;
            test.equal(selected.length, 4);
            test.equal(selected[0].from, 'main');
            test.equal(selected[1].from, 'main');
            test.equal(selected[2].from, 'joiner');
            test.equal(selected[3].from, 'joiner');
            test.equal(selected[0].index, 0);
            test.equal(selected[1].index, 1);
            test.equal(selected[2].index, 0);
            test.equal(selected[3].index, 1);
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.ok(false, 'failed');
            test.done();
        }
    },

    'select-join-removal-from-main-flip': function(test) {
        var q = 'select p.ProductID[0].Value, p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.inventoryCountResponse from products as p, prodstats as ps where ps.productid = p.ProductID[0].Value';
        try {
            var cooked = compiler.compile(q);
            test.equal(cooked[0].type, 'select');
            test.equal(cooked[0].joiner.type, 'select');
            test.equal(cooked[0].joiner.whereCriteria[0].lhs.name, 'ps.productid');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.value, 'p.ProductID[0].Value');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.joiningColumn, 0);
            test.equal(cooked[0].extras.length, 0);
            test.equal(cooked[0].joiner.extras.length, 1);
            test.equal(cooked[0].joiner.extras[0], 2);
            var selected = cooked[0].selected;
            test.equal(selected.length, 5);
            test.equal(selected[0].from, 'main');
            test.equal(selected[1].from, 'main');
            test.equal(selected[2].from, 'main');
            test.equal(selected[3].from, 'joiner');
            test.equal(selected[4].from, 'joiner');
            test.equal(selected[0].index, 0);
            test.equal(selected[1].index, 1);
            test.equal(selected[2].index, 2);
            test.equal(selected[0].index, 0);
            test.equal(selected[1].index, 1);
            test.done();
        }
        catch(e) {
            test.ok(false, 'failed');
            test.done();
        }
    },

    'select-join-removal-from-join-flip': function(test) {
        var q = 'select p.StockPhotoURL, p.Title, ps.buyBoxPriceResponse, ps.productid, ps.inventoryCountResponse from products as p, prodstats as ps where ps.productid = p.ProductID[0].Value';
        try {
            var cooked = compiler.compile(q);
            test.equal(cooked[0].type, 'select');
            test.equal(cooked[0].joiner.type, 'select');
            test.equal(cooked[0].joiner.whereCriteria[0].lhs.name, 'ps.productid');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.value, 'p.ProductID[0].Value');
            test.equal(cooked[0].joiner.whereCriteria[0].rhs.joiningColumn, 2);
            test.equal(cooked[0].extras.length, 1);
            test.equal(cooked[0].extras[0], 2);
            test.equal(cooked[0].joiner.extras.length, 0);
            var selected = cooked[0].selected;
            test.equal(selected.length, 5);
            test.equal(selected[0].from, 'main');
            test.equal(selected[1].from, 'main');
            test.equal(selected[2].from, 'joiner');
            test.equal(selected[3].from, 'joiner');
            test.equal(selected[4].from, 'joiner');
            test.equal(selected[0].index, 0);
            test.equal(selected[1].index, 1);
            test.equal(selected[2].index, 0);
            test.equal(selected[3].index, 1);
            test.equal(selected[4].index, 2);
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.ok(false, 'failed');
            test.done();
        }
    },

    'select-mismatched-quotes-left': function(test) {
        var q = 'select * from ebay.finding.items where keywords="cooper\'';
        try {
            compiler.compile(q);
            test.ok(false, 'compilation did not fail');
            test.done();
        }
        catch(e) {
            test.ok(true, 'compilation did not fail');
            test.done();
        }
    },

    'select-mismatched-quotes-right': function(test) {
        var q = 'select * from ebay.finding.items where keywords=\'cooper"';
        try {
            compiler.compile(q);
            test.ok(false, 'compilation did not fail');
            test.done();
        }
        catch(e) {
            test.ok(true, 'compilation did not fail');
            test.done();
        }
    },

    'select-number': function(test) {
        var cooked, q = 'select * from ebay.finding.items where keywords=1234';
        try {
            cooked = compiler.compile(q);
            test.ok(true, 'compilation did not fail');
            test.equals(cooked[0].type, 'select');
            test.ok(cooked[0].whereCriteria[0]);
            test.equals(cooked[0].whereCriteria[0].rhs, 1234);
            test.done();
        }
        catch(e) {
            test.ok(false, 'compilation did not fail');
            test.done();
        }
    },

    'select-join-joiner-cols': function(test) {
        var q = "select details.StockPhotoURL, products.ProductID[0].Value from ebay.shopping.products as products, ebay.shopping.productdetails as details\n\
                    where details.ProductID = products.ProductID[0].Value and\n\
                          details.siteid = '0' and\n\
                          details.ProductType = 'Reference' and\n\
                          products.QueryKeywords = 'iPhone' and\n\
                          products.siteid = 0;"
        var statement = compiler.compile(q);
        test.equals(statement[0].type, 'select');
        test.deepEqual(statement[0].columns, [
            {name: "products.ProductID[0].Value"}
        ]);
        test.deepEqual(statement[0].selected, [
            {
                "from": "joiner",
                "index": 0
            },
            {
                "from": "main",
                "index": 0
            }
        ]);
        test.deepEqual(statement[0].extras.length, 0);
        test.deepEqual(statement[0].whereCriteria, [
            {
                "operator": "=",
                "lhs": {name: "products.QueryKeywords"},
                "rhs": {
                    "value": "iPhone"
                }
            },
            {
                "operator": "=",
                "lhs": {name: "products.siteid"},
                "rhs": 0
            }
        ]);
        test.deepEqual(statement[0].fromClause[0], {
            "name": "ebay.shopping.products",
            "alias": "products"
        });
        test.ok(statement[0].joiner);
        test.equals(statement[0].joiner.type, 'select');
        test.deepEqual(statement[0].joiner.columns, [
            {name: "details.StockPhotoURL"},
            {name: "details.ProductID"}
        ]);
        test.deepEqual(statement[0].joiner.extras[0], 1);
        test.deepEqual(statement[0].joiner.whereCriteria, [
            {
                "operator": "=",
                "lhs": {name: "details.ProductID"},
                "rhs": {
                    "type": "alias",
                    "value": "products.ProductID[0].Value",
                    "joiningColumn": 0
                }
            },
            {
                "operator": "=",
                "lhs": {name: "details.siteid"},
                "rhs": {
                    "value": "0"
                }
            },
            {
                "operator": "=",
                "lhs": {name: "details.ProductType"},
                "rhs": {
                    "value": "Reference"
                }
            }
        ]);
        test.deepEqual(statement[0].joiner.fromClause[0], {
            "name": "ebay.shopping.productdetails",
            "alias": "details"});
        test.done();
    },

    'select-colon': function(test) {
        var q = 'select a:b.c:d from someXml';
        var statement = compiler.compile(q);
        var e = [
            {
                type: 'select',
                line: 1,
                fromClause: [
                    {'name': 'someXml' }
                ],
                columns: [
                    {name: 'a:b.c:d'}
                ],
                whereCriteria: undefined,
                id: 0,
                line: 1
            }
        ];
        test.deepEqual(statement, e);
        test.done();
    },

    'select-column-alias-mismatch': function(test) {
        var q = "select e.Title as title, e.ItemID, g.geometry.location from ebay.item as e, google.geocode as g where e.itemId in\
            (select itemId from ebay.finding.items where keywords = 'mini') and g.address = e.Location";
        try {
            compiler.compile(q);
            test.ok(false, 'Failed');
        }
        catch(e) {
            test.ok(true, 'Compilation not failed due to insufficient column aliases');
            test.done();
        }
    },

    'select-column-alias-check': function(test) {
        var i, statement;
        var q = 'watches = select d.ItemID as itemId, d.Title as title, w.BiddingDetails.MaxBid.$t as userMaxBid\
          from watchList as w, itemDetails as d where w.ItemID = d.ItemID';
        statement = compiler.compile(q);
        statement = statement[0];
        // ensure that each column has an alias
        for(i = 0; i < statement.columns.length; i++) {
            test.ok(statement.columns[i].alias, 'column ' + statement.columns[i].name + ' has no alias');
        }
        for(i = 0; i < statement.fromClause.length; i++) {
            test.ok(statement.fromClause[i].alias, 'column ' + statement.fromClause[i].name + ' has no alias');
        }
        for(i = 0; i < statement.joiner.columns.length; i++) {
            test.ok(statement.joiner.columns[i].alias, 'column ' + statement.joiner.columns[i].name + ' has no alias');
        }
        for(i = 0; i < statement.fromClause.length; i++) {
            test.ok(statement.joiner.fromClause[i].alias, 'column ' + statement.joiner.fromClause[i].name + ' has no alias');
        }
        test.done();
    },

    'select-column-prefix-mismatch': function(test) {
        var q = 'select BidCount as bids, ti.BuyItNowPrice as p from item as i, tradingItem as ti where i.ItemID = ti.ItemID'
        try {
            compiler.compile(q);
            test.ok(false, 'Failed');
        }
        catch(e) {
            test.ok(true, 'Compilation not failed due to missing prefix');
            test.done();
        }
    },

    'select-main-column-alias-prefix': function(test) {
        var q = 'watches = select d.ItemID as itemId, w.ItemId as witemId, d.Title as title, w.BiddingDetails.MaxBid.$t as userMaxBid\
                  from watchList as w, itemDetails as d where w.ItemID = d.ItemID;'
        var cooked = compiler.compile(q);
        test.equals(cooked.length, 1);
        test.equals(cooked[0].columns[0].name, 'w.ItemId');
        test.equals(cooked[0].columns[0].alias, 'witemId');
        test.equals(cooked[0].columns[1].name, 'w.BiddingDetails.MaxBid.$t');
        test.equals(cooked[0].columns[1].alias, 'userMaxBid');
        test.equals(cooked[0].columns[2].name, 'w.ItemID');
        test.equals(cooked[0].columns[2].alias, 'ItemID');

        test.equals(cooked[0].selected[0].from, 'joiner');
        test.equals(cooked[0].selected[0].name, 'itemId');
        test.equals(cooked[0].selected[1].from, 'main');
        test.equals(cooked[0].selected[1].name, 'witemId');
        test.equals(cooked[0].selected[2].from, 'joiner');
        test.equals(cooked[0].selected[2].name, 'title');
        test.equals(cooked[0].selected[3].from, 'main');
        test.equals(cooked[0].selected[3].name, 'userMaxBid');

        test.equals(cooked[0].joiner.columns[0].name, 'd.ItemID');
        test.equals(cooked[0].joiner.columns[0].alias, 'itemId');
        test.equals(cooked[0].joiner.columns[1].name, 'd.Title');
        test.equals(cooked[0].joiner.columns[1].alias, 'title');
        test.done();
    }
};