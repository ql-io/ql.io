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
    selectvsref : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload: ' '
            },
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                   {
                    "Errors" : [
                        {
                            "ShortMessage" : "Missing required input element.",
                            "LongMessage" : "Required input element is missing from the request.",
                            "ErrorCode" : "1.19",
                            "SeverityCode" : "Error",
                            "ErrorParameters" : [
                            {
                                "Value" : "ItemID",
                                "ParamID" : "0"
                            }
                            ],
                            "ErrorClassification" : "RequestError"
                    }]
                    }
                )
            }
        ],
        script: 'create table first on select get from "http://localhost:3000/"\n\
                 create table second on select get from "http://localhost:3026/";\n\
                 firstResponse = select * from first;\n\
                 be1 = select Errors from firstResponse;\n\
                 be2 = "{firstResponse.Errors}";\n\
                 secondResponse = select * from second;\n\
                 me1 = select Errors from secondResponse;\n\
                 me2 = "{secondResponse.Errors}";\n\
                 return { "be1" : "{be1}", "be2" : "{be2}", "me1" : "{me1}", "me2" : "{me2}"}',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                }
                else {
                    result = result.body;
                    test.ok(_.isArray(result.be1));
                    test.ok(_.isUndefined(result.be1[0]));
                    test.ok(_.isUndefined(result.be2));
                    test.deepEqual(result.me1[0], result.me2);
                }
            }
        }
    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine()
});