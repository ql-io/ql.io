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
    util = require('util'),
    http = require('http');

var Engine = require('../lib/engine');

var cooked = {
    selecttimes : {
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
        script: 'create table items on select get from "http://localhost:3000/"'+
                'using patch "test/patches/scatter.js"'+
                'Response = select * from items;'+
                'return "{Response.$..Item}";',


        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.fail('got error: ' + err.stack || err);
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.equals(result.body.length, 6, 'expected 6 items since we scatter three requests');

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