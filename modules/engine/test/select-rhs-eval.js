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

var _    = require('underscore'),
    util = require('util');

var Engine = require('../lib/engine');

var cooked = {
    select:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:
                    JSON.stringify(
                        {
                                    "ItemID":"230747343910"
                        }
                    )
            },
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        "Item":[
                        {
                            "ItemID":"230747343910"
                        } ]
                    }
                )
            }
        ],
        script: 'create table finding.items on select get from "http://localhost:3000/"'+
                'create table multipleitems on select get from "http://localhost:3026/"'+
                'ids = select ItemID from finding.items where keywords = "iPad 2" limit 1;'+
                'payload = select * from multipleitems where ItemId in "{ids}";'+
                'items = "{payload.Item}";'+
                'items2 = "{items.ItemID}";'+
                'return { "ids": "{ids}","ids2": "{items2}" }',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.ok(_.isObject(result.body), 'expected an object');
                    test.ok(_.isArray(result.body.ids));
                    test.ok(_.isArray(result.body.ids2));
                    test.equals(result.body.ids2.length, 1);
                    var ids = [];
                    _.each(result.body.ids, function(id) {
                        ids.push(Number(id));
                    });
                    var ids2 = [];
                    _.each(result.body.ids2, function(id) {
                        ids2.push(Number(id));
                    })
                    _.each(ids, function(id) {
                        var index = ids2.indexOf(id);
                        test.ok(index >= 0, id + ' not found');
                    })

                }
            }
        }
    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});