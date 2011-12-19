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
    config: __dirname + '/config/dev.json',
    connection: 'close'
});

module.exports = {
    'select': function(test) {
        var script = 'create table multipleitems\
                        on select get from "http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={20|itemId}"\
                        using defaults format = "JSON", apikey = "{config.ebay.apikey}", limit = 200\
                        ids = select itemId from ebay.finding.items where keywords = "iPad 2" limit 4;\
                        payload = select * from multipleitems where itemId in ("{ids}");\
                        items = "{payload.Item}";\
                        items2 = "{items.ItemID}";\
                        return {\
                            "ids": "{ids}",\
                            "ids2": "{items2}"\
                        };';
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.ok(_.isObject(result.body), 'expected an object');
                test.ok(_.isArray(result.body.ids));
                test.ok(_.isArray(result.body.ids2));
                var ids = [];
                _.each(result.body.ids, function(id) {
                    ids.push(id[0]);
                });
                var ids2 = [];
                _.each(result.body.ids2, function(id) {
                    ids2.push(id[0]);
                })
                _.each(ids, function(id) {
                    var index = ids2.indexOf(id);
                    test.ok(index >= 0, id + ' not found');
                })
                test.done();
            }
        });
    },
    'select-less': function(test) {
        var script = 'create table multipleitems\
        on select get from "http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={20|itemId}"\
        using defaults format = "JSON", apikey = "{config.ebay.apikey}", limit = 10\
        ids = select itemId from ebay.finding.items where keywords = "iPad 2" limit 4;\
        payload = select * from multipleitems where itemId in ("{ids}");\
        items = "{payload.Item}";\
        ids2 = "{items.ItemID}";\
        return {\
         "ids": "{ids}",\
         "ids2": "{ids2}"\
        };';
        engine.exec(script, function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.ok(_.isObject(result.body), 'expected an object');
                test.ok(_.isArray(result.body.ids));
                test.ok(_.isArray(result.body.ids2));
                test.equals(result.body.ids2.length, 4);
                test.done();
            }
        });
    }
}
