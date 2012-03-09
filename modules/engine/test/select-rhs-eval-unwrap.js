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
    evalunwrapreturn : {
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
                'create table mi1 on select get from "http://localhost:3026/"'+
                'ids = select ItemId from finding.items where keywords = "iPad 2" limit 1;'+
                'i1all = select * from mi1 where itemId in ("{ids}");'+
                'i1 = "{i1all.Item}";'+
                'return i1;',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.ok(_.isArray(result.body));
                    test.ok(result.body[0].ItemID);
                    test.ok(result.body[0].ItemID);

                }
            }
        }
    },
    evalunwraprhs: {
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
                                "ItemID":"230747343910",
                                "Title":"iPad 2 Black"
                            } ]
                    }
                )
            },
            {
                port: 3028,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        "Item":[
                            {
                                "ItemID":"230747343910",
                                "Title": "iPad 2 White"
                            } ]
                    }
                )

            }

        ],
        script: 'create table finding.items on select get from "http://localhost:3000/"'+
                'create table mi1 on select get from "http://localhost:3026/"'+
                'create table mi2 on select get from "http://localhost:3028/"'+
                'resultset "Item"'+
                'ids = select ItemID from finding.items where keywords = "iPad 2" limit 1;'+
                'i1all = select * from mi1 where itemId in ("{ids}");'+
                'i1 = "{i1all.Item}";'+
                'i2 = select * from mi2 where itemId in ("{ids}");'+
                'return {"ids": "{ids}","i1": "{i1}","i2": "{i2}" }',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.fail('got error: ' + err.stack || err);

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
                        test.ok(ids.indexOf((item.ItemID)) >= 0);
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