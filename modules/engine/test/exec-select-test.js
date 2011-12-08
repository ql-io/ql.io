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

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    sys = require('sys'),
    MutableURI = require('ql.io-mutable-uri'),
    EventEmitter = require('events').EventEmitter(),
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    connection: 'close'
});

module.exports = {
    'select-star': function(test) {
        var q;
        q = 'select * from ebay.finding.items where keywords = "ipad"';
        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(!_.isArray(list.body[0]), 'expected object in the array');
                test.done();
            }
        });
    },
    'select-star-port': function(test) {
        var script = "create table mytable \
                    on select get from 'http://svcs.ebay.com:80/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}'\
                     with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\
                     using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\
                           apikey = '{config.ebay.apikey}', limit = 10, pageNumber = 1\
                     resultset 'findItemsByKeywordsResponse.searchResult.item';\n\
        select * from mytable where keywords = 'ipad'";
        engine.exec(script, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(!_.isArray(list.body[0]), 'expected object in the array');
                test.done();
            }
        });
    },
    'select-some': function(test) {
        var q = 'select title, itemId, primaryCategory.categoryName, ' +
            'sellingStatus.currentPrice from ebay.finding.items where keywords="cooper" and ' +
            'FreeShippingOnly = "true" and MinPrice = "100" limit 10 offset 20';

        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(_.isArray(list.body[0]), 'expected array in the array');
                test.equals(4, list.body[0].length, 'expected four fields');
                test.done();
            }
        });
    },
    'select-some-with-aliases': function(test) {
        var q = 'select title as title, itemId as id, primaryCategory.categoryName as cat,' +
            'sellingStatus.currentPrice as price from ebay.finding.items where keywords="cooper" and' +
            'FreeShippingOnly = "true" and MinPrice = "100" limit 10 offset 20';
        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(_.isObject(list.body[0]), 'expected object in the array');
                test.ok(list.body[0].title);
                test.ok(list.body[0].id);
                test.ok(list.body[0].cat);
                test.ok(list.body[0].price);
                test.done();
            }
        });
    },
    'subselect': function(test) {
        var q = "select Location from ebay.shopping.item where itemId in (select itemId from ebay.finding.items where keywords='ipad')"
        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.equals(10, list.body.length, 'expected 10 locations');
                test.done();
            }
        });
    },
    'select-in-csv': function(test) {
        engine.exec('select itemId from ebay.finding.items where keywords = "mini cooper convertible" limit 2', function(err, list) {
            var q = "select ViewItemURLForNaturalSearch from ebay.shopping.item where itemId in ('" + list.body[0] + "', '" + list.body[1] + "') and includeSelector = 'ShippingCosts'";
            engine.exec(q, function(err, list) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.ok(_.isArray(list.body), 'expected an array');
                    test.equals(2, list.body.length, 'expected 2 items');
                    test.done();
                }
            });
        });
    },
    'select-in-csv-req-count-multivalued': function(test) {
        engine.exec({
            script: 'select itemId from ebay.finding.items where keywords = "mini cooper convertible" limit 2',
            cb: function(err, list) {
                var count = 0;
                var listener = function() {
                    count++;
                }
                var emitter = new EventEmitter.EventEmitter();
                emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

                // We need to test that two HTTP requests are made for the following statement below.
                var q = "select ViewItemURLForNaturalSearch from ebay.shopping.item where itemId in ('" + list.body[0] + "', '" + list.body[1] + "') and includeSelector = 'ShippingCosts'";
                engine.exec({
                    script : q,
                    emitter: emitter,
                    cb: function(err, list) {
                        if(err) {
                            test.fail('got error: ' + err.stack || err);
                            test.done();
                        }
                        else {
                            test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                            test.ok(_.isArray(list.body), 'expected an array');
                            test.equals(2, list.body.length, 'expected 2 items');
                            test.equals(1, count, 'Expected two HTTP requests');
                            test.done();
                        }
                    }
                })
            }
        });
    },
    // This test forks the ebay.shopping.item table to take only one item ID
    'select-in-csv-req-count-singlevalued': function(test) {
        engine.exec({
            script: 'select itemId from ebay.finding.items where keywords = "mini cooper convertible" limit 2',
            cb: function(err, list) {
                var count = 0;
                var listener = function() {
                    count++;
                }
                var emitter = new EventEmitter.EventEmitter();
                emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

                // We need to test that two HTTP requests are made for the following statement below.
                var q = "create table myitemdetails \
                         on select get from 'http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={itemId}'\
                         with aliases json = 'JSON', xml = 'XML'\
                         using defaults format = 'JSON',\
                         apikey =  '{config.ebay.apikey}'\
                         resultset 'Item';\
                        select ViewItemURLForNaturalSearch from myitemdetails where itemId in ('" + list.body[0] + "', '" + list.body[1] + "') and includeSelector = 'ShippingCosts'";
                engine.exec({
                    script : q,
                    emitter: emitter,
                    cb: function(err, list) {
                        if(err) {
                            test.fail('got error: ' + err.stack || err);
                            test.done();
                        }
                        else {
                            test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                            test.ok(_.isArray(list.body), 'expected an array');
                            test.equals(2, list.body.length, 'expected 2 items');
                            test.equals(2, count, 'Expected two HTTP requests');
                            test.done();
                        }
                    }
                })
            }
        });
    },
    // This test forks the ebay.shopping.item table to take only 2 item IDs
    'select-in-csv-req-count-multivalued-max': function(test) {
        engine.exec({
            script: 'select itemId from ebay.finding.items where keywords = "mini cooper convertible" limit 4',
            cb: function(err, list) {
                var count = 0;
                var listener = function() {
                    count++;
                }
                var emitter = new EventEmitter.EventEmitter();
                emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

                // We need to test that two HTTP requests are made for the following statement below.
                var q = "create table myitemdetails \
                         on select get from 'http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={^2|itemId}'\
                         with aliases json = 'JSON', xml = 'XML'\
                         using defaults format = 'JSON',\
                         apikey =  '{config.ebay.apikey}'\
                         resultset 'Item';\
                        select ViewItemURLForNaturalSearch from myitemdetails where itemId in ('" +
                    list.body[0] + "', '" + list.body[1] + "', '" + list.body[2] + "', '" + list.body[3] +
                    "') and includeSelector = 'ShippingCosts'";
                engine.exec({
                    script : q,
                    emitter: emitter,
                    cb: function(err, list) {
                        if(err) {
                            test.fail('got error: ' + err.stack || err);
                            test.done();
                        }
                        else {
                            test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                            test.ok(_.isArray(list.body), 'expected an array');
                            test.equals(4, list.body.length, 'expected 4 items');
                            test.equals(2, count, 'Expected two HTTP requests');
                            test.done();
                        }
                    }
                })
            }
        });
    },
    'locationsearch': function(test) {
        var q = "select itemId, title from ebay.finding.category where categoryId in (" +
            "select primaryCategory.categoryId from ebay.finding.items where keywords='ipad' limit 1) " +
            "and zip = '98074' and distance = '10'";
        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(_.isArray(list.body[0]), 'expected array in the array');
                test.equals(2, list.body[0].length, 'expected two fields');
                test.done();
            }
        });
    },
    'join': function(test) {
        var i, found = false;
        var q = "select p.Title, ps.inventoryCountResponse.totalCount from ebay.shopping.products as p, ebay.shopping.productstats as ps where p.QueryKeywords = 'iPhone' and p.siteid = '0' and ps.productID = p.ProductID[0].Value";
        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(_.isArray(list.body[0]), 'expected array in the array');
                for(i = 0; i < list.body.length; i++) {
                    found = list.body[i].length === 2;
                    if(found) {
                        break;
                    }
                }
                test.ok(found, 'expected three fields for at least one- ' + sys.inspect(list.body, false, 10));
                test.done();
            }
        });
    },
    'in and': function(test) {
        engine.exec('select itemId from ebay.finding.items where keywords = "mini cooper convertible" limit 2', function(err, list) {
            var q = "select * from ebay.shopping.item where itemId in ('" + list.body[0] + "', '" + list.body[1] + "') and includeSelector = 'ShippingCosts'";
            engine.exec(q, function(err, list) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.ok(_.isArray(list.body), 'expected an array');
                    test.equals(2, list.body.length, 'expected 2 items');
                    test.ok(list.body[0].ShippingCostSummary, 'expected shipping cost summary');
                    test.ok(list.body[1].ShippingCostSummary, 'expected shipping cost summary');
                    test.done();
                }
            });
        })
    },
    'equals replace': function(test) {
        var script = 'itemId = select itemId[0] from ebay.finding.items where keywords = "ferrari" limit 1;\
                      details = select * from ebay.shopping.item where itemId = "{itemId}"\
                      return {\
                        "details" : "{details}"\
                      };'
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(result.headers['content-type'], 'application/json', 'JSON expected');
                test.ok(result.body.details);
                test.done();
            }
        })
    },
    'validator': function(test) {
        var q;
        q = 'select * from ebay.finding.items where keywords = "ipad" and globalid="XYZ"';
        engine.exec(q, function(err) {
            if(err) {
                test.ok(true, 'Good.');
                test.done();
            }
            else {
                test.ok(false, 'Expected to fail');
                test.done();
            }
        });
    },
    'pagination': function(test) {
        var parsed, page;
        var q = "select title[0], itemId[0] \
            from ebay.finding.items where keywords= 'cooper' and FreeShippingOnly = 'true' and MinPrice = '100' \
            limit 10 offset ";

        var listener = function(payload) {
            parsed = new MutableURI(payload.uri);
        }
        var emitter = new EventEmitter.EventEmitter();
        emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

        engine.exec({
            emitter: emitter,
            script: q + "110",
            cb: function(err) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Failed.');
                    test.done();
                }
                else {
                    // Check the paginationInput.pageNumber parameter.
                    page = parsed.getParam('paginationInput.pageNumber')
                    test.equals(page, 11);
                    test.done();
                }
            }
        });
    },

    'return-statement': function(test) {
        var q = "return select * from ebay.finding.items where keywords = 'mini cooper' limit 10;";
        engine.exec(q, function(err, result) {
            if(err) {
                test.ok(false, 'failed');
                test.done();
            }
            else {
                test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(result.body), 'expected an array');
                test.ok(result.body.length > 0, 'expected some items');
                test.ok(!_.isArray(result.body[0]), 'expected object in the array');
                test.done();
            }
        });
    },

    'return-ref': function(test) {
        var q = "minis = select * from ebay.finding.items where keywords = 'mini cooper' limit 10;\n\
                 return minis;";
        engine.exec(q, function(err, result) {
            if(err) {
                test.ok(false, 'failed');
                test.done();
            }
            else {
                test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(result.body), 'expected an array');
                test.ok(result.body.length > 0, 'expected some items');
                test.ok(!_.isArray(result.body[0]), 'expected object in the array');
                test.done();
            }
        });
    },

    'select-digits': function(test) {
        var q;
        q = 'select * from ebay.finding.items where keywords = 12345';
        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(!_.isArray(list.body[0]), 'expected object in the array');
                test.done();
            }
        });
    },

    'select-local-select-alias': function(test) {
        var q = 'create table myitems\n\
                 on select get from "http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID=EBAY-US&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT=XML&REST-PAYLOAD&keywords={^keywords}"\n\
                 using defaults apikey =  "{config.ebay.apikey}"\n\
                 resultset "findItemsByKeywordsResponse.searchResult.item";\n\
                data = select * from myitems where keywords = "iPhone 4S";\n\
                return select itemId as id, title as t from data;';
        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.ok(_.isArray(list.body), 'expected an array');
                test.ok(list.body.length > 0, 'expected some items');
                test.ok(_.isObject(list.body[0]), 'expected object in the array');
                test.ok(list.body[0].id);
                test.ok(list.body[0].t);
                test.done();
            }
        });
    },

    'only-comments': function(test) {
        var q = " --blah \n     \
                  --blah \n     \
                  -- blah";
        engine.exec(q, function(err, list) {
            test.fail('nothing to execute and return');

        });
        test.ok(true);
        test.done();
    },

    'select-within-comments': function(test) {
        var q = " --blah \n     \
                  --blah \n     \
                  -- blah \n    \
                  select * from ebay.finding.items where keywords = 12345 \n \
                  -- blah";
        engine.exec(q, function(err, list) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.ok(list.body.length > 0, 'expected some items');
                test.done();
            }
        });
    }
}
