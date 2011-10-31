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
    sys = require('sys'),
    logger = require('winston');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    'connection': 'close'
});

module.exports = {
    'select-dyna-patch': function(test) {
        var script = "-- Get an item ID\n\
                      itemId = select itemId from ebay.finding.items where keywords = 'ferrari' limit 1;\n\
                      -- Use the table\n\
                      item = select * from mytable where itemId = '{itemId}';\n\
                      return {\"itemId\" : \"{itemId}\", \"item\" : \"{item}\"};"
        engine.exec(script, function(err, result) {
            if(err) {
                test.ok(false);
            }
            else if(result) {
                test.equals(result.body.itemId, result.body.item.ItemID);
            }
            test.done();
        });
    },

    'select-dyna-patch-no-url': function(test) {
        var script = "-- Get an item ID\n\
                          itemId = select itemId from ebay.finding.items where keywords = 'ferrari' limit 1;\n\
                          -- Use the table\n\
                          item = select * from mytable where itemId = '{itemId}';\n\
                          return {\"itemId\" : \"{itemId}\", \"item\" : \"{item}\"};"
        engine.exec(script, function(err, result) {
            if(err) {
                test.ok(false);
            }
            else if(result) {
                test.ok(true);
            }
            test.done();
        });
    }
}