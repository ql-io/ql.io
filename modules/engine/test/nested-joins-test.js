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

var _ = require('underscore'),
    Engine = require('lib/engine'),
    EventEmitter = require('events').EventEmitter,
    sys = require('sys'),
    http = require('http'),
    fs = require('fs'),
    util = require('util');

module.exports = {
    'join-test-1' : function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
                connection : 'close'
            });
            var script = fs.readFileSync(__dirname + '/mock/nested1.ql', 'UTF-8');
            engine.exec(script, function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.ok(results.GetMyeBayBuyingResponse);
                    test.ok(results.GetMyeBaySellingResponse);
                    test.ok(results.itemDetails);
                    test.ok(results.wonList);
                    test.ok(results.soldList);
                    test.ok(results.watchList);
                    test.ok(!results.unsoldList);
                    test.ok(results.won);
                    test.ok(results.sold);
                    test.ok(results.watches);
                    test.ok(!results.unsold);

                    // itemDetails and soldList are arrays
                    test.ok(_.isArray(results.itemDetails));
                    test.ok(_.isArray(results.soldList));

                    // watchList and wonList are objects (due to XML-JSON conv)
                    test.ok(_.isObject(results.watchList));
                    test.ok(_.isObject(results.wonList));

                    // Test contents
                    _.each(results.itemDetails, function(item) {
                        test.ok(item.ItemID);
                        test.ok(isNumber(item.ItemID));
                    });

                    test.ok(results.wonList.Transaction);
                    test.ok(results.wonList.Transaction.Item);
                    test.equals(results.soldList.length, 3);
                    _.each(results.soldList, function(sold) {
                        test.ok(sold.Transaction);
                        test.ok(sold.Transaction.Buyer);
                        test.ok(sold.Transaction.Status);
                        test.ok(sold.Transaction.Item);
                    });

                    test.ok(results.watchList.ItemID);
                    test.equals(results.won.length, 1);
                    test.equals(results.won[0].itemId, '350490245586');

                    test.equals(results.sold.length, 3);
                    _.each(results.sold, function(soldItem) {
                        test.ok(soldItem.itemId);
                    })

                    test.equals(results.watches.length, 1);
                    test.equals(results.watches[0].itemId, '380192707119');

                    test.done();
                }
                server.close();

            });
        });
    },

    'join-test-2' : function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
                connection : 'close'
            });
            var script = fs.readFileSync(__dirname + '/mock/nested2.ql', 'UTF-8');
            engine.exec(script, function(err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.ok(results.GetMyeBayBuyingResponse);
                    test.ok(results.GetMyeBaySellingResponse);
                    test.ok(results.itemDetails);
                    test.ok(results.wonList);
                    test.ok(results.soldList);
                    test.ok(results.watchList);
                    test.ok(!results.unsoldList);
                    test.ok(results.won);
                    test.ok(results.sold);
                    test.ok(results.watches);
                    test.ok(!results.unsold);

                    // All lists are arrays
                    test.ok(_.isArray(results.itemDetails));
                    test.ok(_.isArray(results.soldList));
                    test.ok(_.isArray(results.watchList));
                    test.ok(_.isArray(results.wonList));

                    // Test contents
                    _.each(results.itemDetails, function(item) {
                        test.ok(item.ItemID);
                        test.ok(isNumber(item.ItemID));
                    });

                    _.each(results.wonList, function(won) {
                        test.ok(won.Transaction);
                        test.ok(won.Transaction.Item);
                    })
                    test.equals(results.soldList.length, 2);
                    _.each(results.soldList, function(sold) {
                        test.ok(sold.Transaction);
                        test.ok(sold.Transaction.Buyer);
                        test.ok(sold.Transaction.Status);
                        test.ok(sold.Transaction.Item);
                    });

                    test.equals(results.watchList.length, 23);

                    test.equals(results.won.length, 2);
                    test.equals(results.won[0].itemId, '250888486629');

                    test.equals(results.sold.length, 2);
                    _.each(results.sold, function(soldItem) {
                        test.ok(soldItem.itemId);
                    })

                    test.equals(results.watches.length, 23);
                    test.equals(results.watches[0].itemId, '110763457898');

                    test.done();
                }
                server.close();

            });
        });
    }
}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
