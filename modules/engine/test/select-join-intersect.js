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

var _    = require('underscore');

var Engine = require('../lib/engine');

var cooked = {
    selectjoinintersect:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify(
                    {
                        "Item" : [
                            {   "ItemID" : "110763457898",
                                "Title" : "American Motorcycle 1902 Established t-shirts"

                            },

                            {   "ItemID" : "390359315461",
                                "Title" : "Pumpkin Roll Mennonite Recipe Grannas Heart"

                            }
                        ]
                    }
                )
            },
            {
                port: 3026,
                status:200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        "Item" : [
                            {   "ItemID" : "110763457898",
                                "Title" : "American Motorcycle 1902 Established t-shirts"
                            }
                        ]
                    }
                )
            }
        ],
        script: 'create table buying on select get from "http://localhost:3000"'+
                'create table mi on select get from "http://localhost:3026";'+
                'Response1 = select * from buying;'+
                'List = "{Response1.Item}";'+
                'Response2 = select * from mi;'+
                'itemDetails = "{Response2.Item}";'+
                'List2 = select w.ItemID as itemId, w.Title as title from itemDetails as d, List as w  where w.ItemID=d.ItemID '+
                'return { "List": "{List.$..ItemID}", "List2": "{List2.$..itemId}"}',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                }
                else {
                    result = result.body;
                    test.ok(_.isArray(result.List));
                    test.ok(_.isArray(result.List2));
                    test.equals(result.List.length, 2);
                    test.equals(result.List2.length, 1);
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