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

var theScript =  'create table FISNG on select get from "http://localhost:3026/";\r\n'+
    'create table FMDS on select get from "http://localhost:3052/";\r\n' +
    'create table FISNG_COPY on select get from "http://localhost:3078/";\r\n'+
    'firstResult = select * from FISNG;\r\n' +
    'aspectHist = "{firstResult.aspectHist}";\r\n' +
    'secondResult = select * from FMDS where typename in ("{^aspectHist}");\r\n' +
    'thirdResult = select * from FISNG_COPY where something="{^secondResult}";' +
    'return "{thirdResult}" || "{firstResult}"';

var cooked = {
    positivePath : {
        ports: [
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        status: "success",
                        items: [
                            {
                                id: 1,
                                description: "One",
                                type: 1
                            },
                            {
                                id: 2,
                                description: "TwO",
                                type: 2
                            },
                            {
                                id: 3,
                                description: "Three",
                                type: 3
                            }
                        ]
                        ,
                        aspectHist: [
                            {type: 1},
                            {type: 2}
                        ]
                    }
                )
            },
            {
                port: 3078,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        status: "success",
                        items: [
                            {
                                id: 1,
                                description: "One",
                                type: 1
                            },
                            {
                                id: 2,
                                description: "TwO",
                                type: 2
                            },
                            {
                                id: 3,
                                description: "Three",
                                type: 3
                            }
                        ]
                        ,
                        aspectHist: [
                            {type: 1},
                            {type: 2}
                        ],
                        extra: [
                            {type: 1},
                            {type: 2}
                        ]
                    }
                )
            },
            {
                port: 3052,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        status: "success",
                        items: [
                            {
                                name: "One",
                                type: 1
                            },
                            {
                                name: "Two",
                                type: 2
                            }
                        ]
                    }
                )
            }
        ],
        script: theScript,
        udf: {
            test : function (test, err, result) {
                if(err){
                    return test.fail("Got error: " + util.inspect(err,false,null));
                }
                test.deepEqual(result.body,{ status: 'success',
                    items:
                        [ { id: 1, description: 'One', type: 1 },
                            { id: 2, description: 'TwO', type: 2 },
                            { id: 3, description: 'Three', type: 3 } ],
                    aspectHist: [ { type: 1 }, { type: 2 } ],
                    extra: [ { type: 1 }, { type: 2 } ] } );
            }
        }
    },
    negativePath : {
        ports: [
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify(
                    {
                        status: "success",
                        items: [
                            {
                                id: 1,
                                description: "One",
                                type: 1
                            },
                            {
                                id: 2,
                                description: "TwO",
                                type: 2
                            },
                            {
                                id: 3,
                                description: "Three",
                                type: 3
                            }
                        ]
                    }
                )
            }
        ],
        script: theScript,
        udf: {
            test : function (test, err, result) {
                if(err){
                    return test.fail("Got error: " + util.inspect(err,false,null));
                }
                test.deepEqual(result.body,{ status: 'success',
                    items:
                        [ { id: 1, description: 'One', type: 1 },
                            { id: 2, description: 'TwO', type: 2 },
                            { id: 3, description: 'Three', type: 3 } ]});
            }
        }
    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});