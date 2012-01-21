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
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    fs = require('fs'),
    util = require('util');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    connection: 'close'
});

var maxNestedRequests = engine.config.maxNestedRequests || 50, limit = 10;

module.exports = {
    'max-in-clause-test' : function(test) {
        var server = http.createServer(function(req, res) {
                    var file = __dirname + '/mock/' + req.url;
                    var stat = fs.statSync(file);
                    res.writeHead(200, {
                        'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
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

                var q = 'create table max.in.clause.test.table on select get from "http://localhost:3000/max-in-clause.xml"' +
                    '   using patch "test/tables/ebay.finding.items.js" ' +
                    '   resultset "findItemsByKeywordsResponse.searchResult.item"; ' +
                    'select * from max.in.clause.test.table where keywords in (' + keywords.toString() + ')';
                engine.exec(q, function(err, list) {
                    if(err) {
                        test.fail('got error: ' + err.stack || err);
                        test.done();
                    }
                    else {
                        test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                        test.ok(_.isArray(list.body), 'expected an array');
                        test.ok(list.body.length > 0, 'expected some items');
                        test.ok(!_.isArray(list.body[0]), 'expected object in the array');
                        test.equals(list.body.length, maxNestedRequests * limit, 'expected a different number of results for in-clause');
                        test.done();
                    }
                    server.close();
                });
        });
    },
    'max-funcs-test' : function(test) {
        var server = http.createServer(function(req, res) {
                    var file = __dirname + '/mock/' + req.url;
                    var stat = fs.statSync(file);
                    res.writeHead(200, {
                        'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
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
            var q = 'create table max.funcs.test.table on select get from "http://localhost:3000/max-in-clause.xml"' +
                '   using patch "test/tables/ebay.finding.items.js" ' +
                '   resultset "findItemsByKeywordsResponse.searchResult.item"; ' +
                'select a.ItemID as itemId, b.keywords as keywords from max.funcs.test.table as a, max.funcs.test.table as b where a.keywords = b.keywords and a.keywords  in (' + keywords.toString() + ')';
            engine.exec(q, function(err, list) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(list.body), 'expected an array');
                    test.ok(list.body.length > 0, 'expected some items');
                    test.ok(!_.isArray(list.body[0]), 'expected object in the array');
                    test.equals(list.body.length, maxNestedRequests, 'expected a different number of results for funcs');
                    test.done();
                }
                server.close();
            });
        });
    }
}

// Define 80 keywords. By default only 50 should be queried.
var keywords = [
    'roman',
    'ring',
    'egyptian',
    'greek',
    'chinese',
    'bronze',
    'gold',
    'intaglio',
    'antique',
    'glass',
    'jade',
    'japanese',
    'buddha',
    'bronze',
    'ivory',
    'chinese',
    'painting',
    'netsuke',
    'sword',
    'vase',
    'table',
    'chairs',
    'oak',
    'desk',
    'bed',
    'chair',
    'french',
    'sofa',
    'armoire',
    'dresser',
    'doll',
    'primitive',
    'wood',
    'sign',
    'antique',
    'halloween',
    'basket',
    'table',
    'box',
    'americana',
    'tea',
    'tiffany',
    'sterling',
    'rogers',
    'silver',
    'coin',
    'tray',
    'flatware',
    'gorham',
    'coin',
    'door',
    'stained',
    'cast',
    'iron',
    'window',
    'tile',
    'victorian',
    'shabby',
    'light',
    'garden',
    'bronze',
    'french',
    'deco',
    'lamp',
    'crafts',
    'vase',
    'mirror',
    'frame',
    'antique',
    'nouveau',
    'atlas',
    'globe',
    'texas',
    'italy',
    'world',
    'france',
    'germany',
    'maps',
    'poland',
    'map'
]

