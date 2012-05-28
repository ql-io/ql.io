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
    atomxml : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "atom+xml",
                payload:
                        '<?xml version="1.0" encoding="utf-8"?>'+
                        '<feed xmlns="http://www.w3.org/2005/Atom">'+
                        '<title>Example Feed</title>'+
                        '<author><name>John Doe</name></author>'+
                        '<id>urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6</id>'+
                        '</feed>'
            }
        ],
        script: 'create table plusxml on select get from "http://localhost:3000/";'+
                'aResponse = select * from plusxml;'+
                'return "{aResponse}";',
        udf: {
            test : function (test, err, result) {
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(result.body['feed'], 'expected atom feed in json resp');

                }
            }
        }
    },
    badcontent:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "bad+type",
                payload:
                        '<?xml version="1.0" encoding="utf-8"?>'
            }
        ],
        script: 'create table plusxml on select get from "http://localhost:3000/";'+
                'return select * from plusxml;',
        udf: {
            test : function (test, err, result) {
                if (err) {
                    test.equals(err.message,"No transformer available");
                    test.equals(err.type,"application");
                    test.equals(err.subType,"bad+type");

                }
                else {
                    test.ok(false, 'Expected exception');

                }
            }
        }
    },
    fooxml:{
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "foo+xml",
                payload:
                    '<?xml version="1.0" encoding="utf-8"?>'+
                    ' <foo>bar</foo>'
            }
        ],
        script: 'create table plusxml on select get from "http://localhost:3000/";'+
                'aResponse = select * from plusxml;'+
                'return "{aResponse}";',
        udf: {
            test : function (test, err, result) {
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.equal('bar',result.body['foo'], 'expected foo.bar in json resp');

                }
            }
        }
    },
    soapxml : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "soap+xml",
                payload:
                    '<?xml version="1.0"?>'+
                    '<soap:Envelope xmlns:soap="http://www.w3.org/2001/12/soap-envelope">'+
                    '<soap:Body xmlns:m="http://www.example.org/stock">'+
                    '<m:GetStockPriceResponse>'+
                    '<m:Price>34.5</m:Price>'+
                    '</m:GetStockPriceResponse>'+
                    '</soap:Body></soap:Envelope>'

            }
        ],
        script: 'create table plusxml on select get from "http://localhost:3000/";'+
                'aResponse = select * from plusxml;'+
                'return "{aResponse}";',
        udf: {
            test : function (test, err, result) {
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(result.body['soap:Envelope']['soap:Body'], 'expected soap body in json resp');
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