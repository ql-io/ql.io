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
    dontuseproxy: {
    ports: [
        {
            port: 3026,
            status: 200,
            type: "application",
            subType: "json",
            payload:JSON.stringify( [
                { "geometry" : {
                    "bounds" : {
                        "northeast" : {
                            "lat" : 27.99087720,
                            "lng" : 86.92902090
                        },
                        "southwest" : {
                            "lat" : 27.97698630,
                            "lng" : 86.91631790
                        }
                    }
                }
                }
            ]
            )
              }

            ],
    script: 'create table first on select get from "http://localhost:3026"'+
            'return select * from first where address = "Mount Everest"',

    udf: {
    test : function (test, err, result) {
        if (err) {
            console.log(err.stack || err);
            test.ok(false);
        }
        else {
            test.ok(result && result.body[0].geometry);
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