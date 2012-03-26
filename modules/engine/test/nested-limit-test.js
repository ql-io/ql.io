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

var _    = require('underscore'),
    util = require('util'),
    http = require('http');

var Engine = require('../lib/engine');

var maxNestedRequests =  2 ;

var cooked = {
    maxinclausetest : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:
                    JSON.stringify(
                        [   {"id" : "1",
                                "name" : "A"},
                            {"id" : "2",
                                "name" : "B"},
                            {"id" : "3",
                                "name" : "C"},
                            {"id" : "4",
                                "name" : "D"},
                            {"id" : "5",
                                "name" : "E"}]
                    )
            }
        ],
        script: 'create table payload1 on select get from "http://localhost:3000/foo?id={id}"'+
                'return select * from payload1 where id in (1, 2, 3, 4, 5)',
        udf: {

            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.ok(_.isObject(result.body), 'expected an object');
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(!_.isArray(result.body[0]), 'expected object in the array');
                    test.equals(result.body.length, maxNestedRequests * 5, 'expected a different number of results for in-clause');

                }
            }
        }

    }

}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({
        config: __dirname + '/mock/nested-limit-test.json'
    })
});