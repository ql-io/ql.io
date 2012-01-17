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
    Engine = require('../lib/engine'),
    http = require('http'),
    util = require('util'),
    url = require('url'),
    fs = require('fs');

var engine = new Engine({
    tables: __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    connection: 'close'
});

// This tests merging of multiple HTTP requests
module.exports = {
    'check-merge-field': function (test) {
        var script = 'create table m1\
          on select get from "http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version={^version}&IncludeSelector=Details,ItemSpecifics,ShippingCosts&ItemID={20|itemId}"\
             using defaults format = "JSON",\
                            apikey = "{config.ebay.apikey}",\
                            version = "693"\
             resultset "Item"\
        create table m2\
          on select get from "http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version={^version}&IncludeSelector=Details,ItemSpecifics,ShippingCosts&ItemID={itemId}"\
             using defaults format = "JSON",\
                            apikey = "{config.ebay.apikey}",\
                            version = "693"\
        ids = select itemId from ebay.finding.items where keywords = "iPad" limit 2;\
        mi1 = select * from m1 where itemId in ("{ids}");\
        mi2all = select * from m2 where itemId in ("{ids}");\
        mi2_1 = "{mi2all.Item}";\
        mi2_2 = select Item from mi2all;\
        return {\
        "mi1": "{mi1}",\
        "mi2_1": "{mi2_1}",\
        "mi2_2": "{mi2_2}"\
        }';
        engine.exec(script, function (err, result) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.ok(_.isObject(result.body), 'expected an object');
                test.ok(_.isArray(result.body.mi1));
                test.ok(_.isArray(result.body.mi2_1));
                test.ok(_.isArray(result.body.mi2_2[0]));
                // Sort by ItemID
                var l1 = _.sortBy(result.body.mi1, function (item) {
                    return item.ItemID;
                });
                var l2_1 = _.sortBy(result.body.mi2_1, function (item) {
                    return item.ItemID;
                });
                var l2_2 = _.sortBy(result.body.mi2_2[0], function (item) {
                    return item.ItemID;
                });
                var ids1 = _.map(l1, function (item) {
                    return item.ItemID;
                });
                var ids2_1 = _.map(l2_1, function (item) {
                    return item.ItemID;
                });
                var ids2_2 = _.map(l2_2, function (item) {
                    return item.ItemID;
                });
                test.deepEqual(ids1, ids2_1);
                test.deepEqual(ids1, ids2_2);
                test.done();
            }
        });
    },

    'check-merge-block': function (test) {
        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock' + req.url;
            // Remove query params
            var parsed = url.parse(file, true);
            file = parsed.pathname;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type': file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length': stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function (e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                connection: 'close'
            });
            var script = fs.readFileSync(__dirname + '/mock/merge-block.ql', 'UTF-8');
            engine.exec(script, function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.ok(_.isArray(results));
                    _.each(results, function(item) {
                        test.equals(item.ProductID.Value, 99700122);
                    });
                    server.close();
                    test.done();
                }
            });
        });
    }
}
