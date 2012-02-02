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
    Engine = require('../lib/engine');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

module.exports = {
    'eval-unwrap-rhs': function(test) {
        var script = 'create table mi1\
          on select get from "http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={20|itemId}"\
          using defaults format = "JSON", apikey = "{config.ebay.apikey}", limit = 10\
        create table mi2\
          on select get from "http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={20|itemId}"\
          using defaults format = "JSON", apikey = "{config.ebay.apikey}", limit = 10\
          resultset "Item"\
        ids = select itemId from ebay.finding.items where keywords = "iPad 2" limit 2;\
        i1all = select * from mi1 where itemId in ("{ids}");\
        i1 = "{i1all.Item}";\
        i2 = select * from mi2 where itemId in ("{ids}");\
        return {\
          "ids": "{ids}",\
          "i1": "{i1}",\
          "i2": "{i2}"\
        };';
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.ok(_.isObject(result.body), 'expected an object');
                test.ok(_.isArray(result.body.ids));
                test.ok(_.isArray(result.body.i1));
                test.ok(_.isArray(result.body.i2));
                var ids = [];
                _.each(result.body.ids, function(id) {
                    ids.push(id);
                });
                _.each(result.body.i1[0][0], function(item) {
                    test.ok(ids.indexOf(item.ItemID) >= 0);
                })
                _.each(result.body.i2, function(item) {
                    test.ok(ids.indexOf(item.ItemID) >= 0);
                })
                test.done();
            }
        });
    },
    'eval-unwrap-return': function(test) {
        var script = 'create table mi1\
          on select get from "http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={20|itemId}"\
          using defaults format = "JSON", apikey = "{config.ebay.apikey}", limit = 10\
        create table mi2\
          on select get from "http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={20|itemId}"\
          using defaults format = "JSON", apikey = "{config.ebay.apikey}", limit = 10\
          resultset "Item"\
        ids = select itemId from ebay.finding.items where keywords = "iPad 2" limit 2;\
        i1all = select * from mi1 where itemId in ("{ids}");\
        i1 = "{i1all.Item}";\
        return i1;';
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.ok(_.isArray(result.body));
                test.ok(result.body[0].ItemID);
                test.ok(result.body[0].ItemID);
                test.done();
            }
        });
    }
}
