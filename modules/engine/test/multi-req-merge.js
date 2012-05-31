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
    checkmergefield : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify(
                    {
                        "Item":[
                            {
                                "ItemID":"230747343910"
                            },
                            {
                                "ItemID":"230747343911"
                            }]
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
                status : 200,
                type : "application",
                subType: "json",
                payload:
                    JSON.stringify(
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
        script: 'create table m1 on select get from "http://localhost:3026/"'+
                'resultset "Item"'+
                'create table m2 on select get from "http://localhost:3028/"'+
                'create table m3 on select get from "http://localhost:3000/"'+
                'ids = select ItemID from m3 where keywords = "iPad" limit 2;'+
                'mi1 = select * from m1 where ItemID in ("{ids}");'+
                'mi2all = select * from m2 where ItemID in ("{ids}");'+
                'mi2_1 = "{mi2all.Item}";'+
                'mi2_2 = select Item from mi2all;'+
                'return {"mi1": "{mi1}","mi2_1": "{mi2_1}","mi2_2": "{mi2_2}"}',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);
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
                }
            }
        }
    },
    checkmergeblock : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify (
                    {
                        "ProductID": [
                        {
                            "Value": "99700122",
                            "Type": "Reference"
                        },
                        {
                            "Value": "99700123",
                            "Type": "Reference"
                        },
                        {
                            "Value": "99700124",
                            "Type": "Reference"
                        },
                        {
                            "Value": "99700125",
                            "Type": "Reference"
                        }
                        ]
                    }
                )
            }
        ],
        script: 'create table product on select get from "http://localhost:3000/"'+
                'return select * from product where ProductID in ("99700122","99700123","99700124" );',


        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                }
                else {

                    result = result.body;
                    test.ok(_.isObject(result),'expected an object');
                    test.ok(_.isArray(result.ProductID));

                    test.equals(result.ProductID[0].Value, 99700122);
                    test.equals(result.ProductID[1].Value, 99700123);
                    test.equals(result.ProductID[2].Value, 99700124);
                    test.equals(result.ProductID[3].Value, 99700125);


                }
            }
        }
    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({
    })
})