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

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    util = require('util'),
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

exports["describe route '/foo/bar/{selector}?userid={userId}&itemid={itemId}' using method get"] = function (test) {
    var engine = new Engine({
            tables : __dirname + '/mock-routes/tables',
            routes : __dirname + '/mock-routes/routes',
            config : __dirname + '/config/dev.json'
        });
    var q = "describe route '/foo/bar/{selector}?userid={userId}&itemid={itemId}' using method get";
        engine.exec(q, function(err, list) {

            if (err) {
                 test.fail('got error: ' + err.stack);
            }
            else {
                test.equal(list.body.method,'get');
                test.equal(list.body.path,'/foo/bar/{selector}?userid={userId}&itemid={itemId}');
                test.equal(list.body.about,'/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get');
                test.ok(_.isArray(list.body.info), 'list.body.info is not array');
                test.ok(list.body.info.length > 0, 'Expected length > 0');
                test.ok(_.isArray(list.body.tables), 'list.body.tables is not array');
                test.ok(list.body.tables.length == 5 , 'Expected length = 5');
                test.ok(_.isArray(list.body.related), 'list.body.related is not array');
                test.ok(list.body.related.length == 0 , 'Expected length = 0');
            }
            test.done();
        });

};

exports["describe route '/ping/pong' using method put"] = function (test) {
    var engine = new Engine({
            tables : __dirname + '/mock-routes/tables',
            routes : __dirname + '/mock-routes/routes',
            config : __dirname + '/config/dev.json'
        });
    var q = "describe route '/ping/pong' using method put";
        engine.exec(q, function(err, list) {

            if (err) {
                 test.fail('got error: ' + err.stack);
            }
            else {
                test.equal(list.body.method,'put');
                test.equal(list.body.path,'/ping/pong');
                test.equal(list.body.about,'/route?path=%2Fping%2Fpong&method=put');
                test.ok(_.isArray(list.body.info), 'list.body.info is not array');
                test.ok(list.body.info.length == 0, 'Expected length == 0');
                test.ok(_.isArray(list.body.tables), 'list.body.tables is not array');
                test.ok(list.body.tables.length == 1 , 'Expected length = 1');
                test.ok(_.isArray(list.body.related), 'list.body.related is not array');
                test.ok(list.body.related.length == 1 , 'Expected length = 1');            }
            test.done();
        });
};
