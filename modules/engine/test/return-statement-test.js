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
    returnnumber : {
        ports: [
        ],
        script: 'return 1',
        udf : {
            test : function (test, err, result) {
                if(err) {
                    test.ok(false, 'failed');

                }
                else {
                    test.ok(result.body,'1');

                }
            }

        }
        },
    returnundefined : {
        ports: [
        ],
        script: 'return Item from first',
        udf : {
            test : function (test, err, result) {
                if(err) {
                    test.ok(true, 'failed');
                }
                else {
                    test.ok(false,'Expected to fail');
                }
            }
        }
    },
    returntruearray : {
        ports: [
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify( [
                    {
                        "ItemID":"270898130171",
                        "Location":"Clearwater, Florida"
                    },
                    {
                        "ItemID":"330682531497",
                        "Location":"Not Specified"
                    }
                ]
                )
            }
        ],
        script: 'create table second on select get from "http://localhost:3026"'+
            'Resp = select Location from second where ItemID in ("270898130171","330682531497")'+
            'return Resp',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.equals(2, result.body.length, 'expected 2 locations');

                }
            }
        }
    },
    returnemptyobj : {
        ports: [
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify( [
                    {
                        "ItemID":"270898130171",
                        "Location":"Clearwater, Florida"
                    },
                    {
                        "ItemID":"330682531497",
                        "Location":"Not Specified"
                    }
                ]
                )
            }
        ],
        script: 'create table second on select get from "http://localhost:3026"'+
            'Resp = select ItemID from second\r\n'+
            'Resp2 = "{Resp1.Errors}"'+
            'return {"Resp2":"{Resp2}"}',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);

                }
                else {
                    result = result.body;
                    test.ok(result.Resp2 === undefined);
                }
            }
        }

    },
    returnstatement: {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                    '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse>' +
                        '<searchResult count="1">'+
                        '<item><itemId>260946984736</itemId>'+
                        '<title>Mini : Classic Mini CALL SHAWN B 1978 MINI, RARE CAR, FULLY RESTORED, L@@K AT ME,IM CUTE!!!</title></item>'+
                        '<item><itemId>220949278891</itemId>'+
                        '<title>Mini : Classic Mini 1000 Sedan Austin Mini 1000 - Classic 1974</title></item>'+
                        '</searchResult></findItemsByKeywordsResponse>'
            }
        ],
        script: 'create table finditems on select get from "http://localhost:3000"'+
            'resultset "findItemsByKeywordsResponse.searchResult.item";'+
            'return select * from finditems where keywords = "mini cooper" limit 2;',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.ok(false, 'failed');

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(!_.isArray(result.body[0]), 'expected object in the array');
                }
            }
        }

    },
    returnref:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload:
                    '<?xml version="1.0"?>' +
                        '<findItemsByKeywordsResponse>' +
                        '<searchResult count="1">'+
                        '<item><itemId>260946984736</itemId>'+
                        '<title>Mini : Classic Mini CALL SHAWN B 1978 MINI, RARE CAR, FULLY RESTORED, L@@K AT ME,IM CUTE!!!</title></item>'+
                        '<item><itemId>220949278891</itemId>'+
                        '<title>Mini : Classic Mini 1000 Sedan Austin Mini 1000 - Classic 1974</title></item>'+
                        '</searchResult></findItemsByKeywordsResponse>'
            }
        ],
        script: 'create table finditems on select get from "http://localhost:3000"'+
            'resultset "findItemsByKeywordsResponse.searchResult.item";'+
            'minis = select * from finditems where keywords = "mini cooper" limit 2;'+
            'return "{minis}"',
        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.ok(false, 'failed');
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(!_.isArray(result.body[0]), 'expected object in the array');
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