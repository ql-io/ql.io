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
    findall : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        "OrderTransactionArray": [
                            {
                                "OrderTransaction" : [
                                    {
                                        "ItemID" : "123456"
                                    }
                                ]
                            },
                            {
                                "OrderTransaction" : [
                                    {
                                        "ItemID" : "123456"
                                    }
                                ]
                            }
                        ]
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
                        "OrderTransactionArray": [
                            {
                                "OrderTransaction" : [
                                    {
                                        "ItemID" : "253888486629"
                                    }
                                ]
                            },
                            {
                                "OrderTransaction" : [
                                    {
                                        "ItemID" : "253888486629"
                                    }
                                ]
                            }
                        ]
                    }
                )
            },
            {
                port: 3028,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    [{ "ItemID" : "253888486629"}, {"ItemID" : "123456" }]
                )

            }
        ],
        script:   'create table payload1 on select get from "http://localhost:3000"\r\n'+
                  'create table payload2 on select get from "http://localhost:3026"\r\n'+
                  'create table payload3 on select get from "http://localhost:3028"\r\n'+
                  'Resp1 = select * from payload1\r\n'+
                  'Resp2 = select * from payload2\r\n'+
                  'Resp3 = select * from payload3 where ItemID in ("{Resp2.$..ItemID}", "{Resp1.$..ItemID}")\r\n'+
                  'i1 = "{Resp1.$..ItemID}";\r\n'+
                  'ids = "{Resp3.$..ItemID}";\r\n'+
                  'txb = "{Resp1.$..OrderTransaction}";\r\n'+
                  'txs = "{Resp2.$..OrderTransaction}";\r\n'+
                  'be = "{Resp1.Errors}";\r\n'+
                  'se = "{Resp2.Errors}"\r\n'+
                  'return {"i1": "{i1}","i2": "{Resp2.$..ItemID}","ids": "{ids}","txb": "{txb}","txs": "{txs}","be": "{be}","se": "{se}"}',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');

                }
                else {
                    result = result.body;
                    test.ok(result.i1);
                    test.ok(result.i2);
                    test.ok(result.ids);
                    var i1 = _.sortBy(result.i1, function(id) {
                        return id;
                    });
                    i1 = _.unique(i1);
                    var i2 = _.sortBy(result.i2, function(id) {
                        return id;
                    });
                    i2 = _.unique(i2);
                    var ids = _.sortBy(result.ids, function(id) {
                        return id;
                    });
                    ids = _.unique(result.ids);
                    test.equals(i1.length + i2.length, ids.length);

                    test.equals(result.txb.length, 2);
                    test.equals(result.txs.length, 2);
                    test.ok(result.be === undefined);
                    test.ok(result.se === undefined);

                }
            }
        }

    },
    findallflatten : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        "Item" : [
                            {   "ItemID" : "110763457898",
                                "Title" : "American Motorcycle 1902 Established t-shirts"
                            },
                            {
                                "ItemID" : "110763457898",
                                "Title" : "American Motorcycle 1902 Established t-shirts"
                            }
                        ]
                    }
                )
            }
        ],
        script: 'create table buying on select get from "http://localhost:3000/"'+
                'GetMyeBayBuyingResponse = select * from buying;'+
                'return "{GetMyeBayBuyingResponse.$..Item}";',
        
        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');

                }
                else {
                    result = result.body;
                    test.ok(_.isArray(result));
                    test.equals(result.length, 2);

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