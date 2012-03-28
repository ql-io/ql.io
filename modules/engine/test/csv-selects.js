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

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    util = require('util'),
    url = require('url'),
    EventEmitter = require('events').EventEmitter,
    logger = require('winston'),
    util = require('util'),
    http = require('http'),
    fs = require('fs');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

module.exports = {
    'select-in-csv-req-count-multivalued': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, req.headers, {
                'Content-Type' : 'application/json',
                'Content-Length' : stat.size
            });

            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
                var count = 0;
                var listener = function() {
                    count++;

                }
                var emitter = new EventEmitter();
                emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

                // We need to test that two HTTP requests are made for the following statement below.
                var q = fs.readFileSync(__dirname + '/mock/csv-selects-multival2.ql', 'UTF-8');
                engine.exec({
                    script : q,
                    emitter: emitter,
                    cb: function(err, list) {
                        if(err) {
                            test.fail('got error: ' + err.stack || err);
                            test.done();
                        }
                        else {
                            test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                            test.ok(_.isArray(list.body), 'expected an array');
                            test.equals(2, list.body.length, 'expected 2 items');
                            test.equals(1, count, 'Expected two HTTP requests');
                            test.done();
                            server.close();
                        }
                    }
                })

        });
    },
    'select-in-csv-req-count-singlevalued':function (test) {
        var resultDictionary = {
            "270898130171":[
                {
                    "ItemID":"270898130171",
                    "Location":"Clearwater, Florida",
                    "Shipping":"yes"
                }
            ],
            "330682531497":[
                {
                    "ItemID":"330682531497",
                    "Location":"San jose,California",
                    "Shipping":"yes"
                }
            ]};
        var server = http.createServer(function (req, res) {
            res.writeHead(200, req.headers, {
                'Content-Type':'application/json'

            });
            var query = url.parse(req.url, true).query;
            res.end(JSON.stringify(resultDictionary[query.ItemID] || []));
        });

        server.listen(3026, function () {

            var count = 0;
            var listener = function () {
                count++;
            }
            var emitter = new EventEmitter();
            emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

            // We need to test that two HTTP requests are made for the following statement below.
            var q = 'create table myitemdetails on select get from "http://localhost:3026?ItemID={ItemID}"\r\n' +
                    'select Location from myitemdetails where ItemID in ("270898130171","330682531497");';
            engine.exec({
                script:q,
                emitter:emitter,
                cb:function (err, list) {
                    if (err) {
                        test.fail('got error: ' + err.stack || err);
                        test.done();
                    }
                    else {
                        test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                        test.ok(_.isArray(list.body), 'expected an array');
                        test.equals(2, list.body.length, 'expected 2 items');
                        test.equals(2, count, 'Expected two HTTP requests');
                        server.close();
                        test.done();
                    }
                }
            })
        });
    },
    selectincsvreqcountmultivaluedmax: function (test) {
        var resultDictionary = {
            "270898130171,330682531497":[
                {
                    "ItemID":"270898130171",
                    "Location":"Clearwater, Florida",
                    "Shipping":"yes"
                },
                {
                    "ItemID":"330682531497",
                    "Location":"San jose,California",
                    "Shipping":"yes"
                }
            ],
            "330682531498,330682531499":[
                {
                    "ItemID":"330682531498",
                    "Location":"Santa Clara,California",
                    "Shipping":"yes"
                },
                {
                    "ItemID":"330682531499",
                    "Location":"San jose,California",
                    "Shipping":"yes"
                }
            ]
        };
        var server = http.createServer(function (req, res) {
            res.writeHead(200, req.headers, {
                'Content-Type':'application/json'

            });
            var query = url.parse(req.url, true).query;
            res.end(JSON.stringify(resultDictionary[query.ItemID] || []));
        });

        server.listen(3026, function () {
            var count = 0;
            var listener = function () {
                count++;
            }
            var emitter = new EventEmitter();
            emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

            // We need to test that two HTTP requests are made for the following statement below.
            var q = 'create table myitemdetails on select get from "http://localhost:3026?ItemID={^2|ItemID}"\r\n' +
                'select Location from myitemdetails where ItemID in ("270898130171","330682531497","330682531498","330682531499");';
            engine.exec({
                script:q,
                emitter:emitter,
                cb:function (err, list) {
                    if(err) {
                        test.fail('got error: ' + err.stack || err);
                        test.done();
                    }
                    else {
                        test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                        test.ok(_.isArray(list.body), 'expected an array');
                        test.equals(4, list.body.length, 'expected 4 items');
                        test.equals(2, count, 'Expected two HTTP requests');
                        test.done();
                        server.close();
                    }
                }
            })
        });
}
}