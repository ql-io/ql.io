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
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

exports['describe route "/foo/bar/{selector}?userid={userId}&itemid={itemId}" using method get'] = function (test) {
    var engine = new Engine({
            tables : __dirname + '/mock-routes/tables',
            routes : __dirname + '/mock-routes/routes',
            config : __dirname + '/config/dev.json'
        });
    var q = 'describe route "/foo/bar/{selector}?userid={userId}&itemid={itemId}" using method get';
        engine.exec(q, function(err, list) {

            if (err) {
                 test.fail('got error: ' + err.stack);
            }
            else {
                test.equal(list.body.method,'get');
                test.equal(list.body.path,'/foo/bar/{selector}?userid={userId}&itemid={itemId}');
                test.equal(list.body.about,'/route?path=%2Ffoo%2Fbar%2F%7Bselector%7D%3Fuserid%3D%7BuserId%7D%26itemid%3D%7BitemId%7D&method=get');
                test.ok(_.isString(list.body.info), 'list.body.info is string');
                test.ok(_.isArray(list.body.tables), 'list.body.tables is not array');
                test.ok(list.body.tables.length == 5 , 'Expected length = 5');
                test.ok(_.isArray(list.body.related), 'list.body.related is not array');
                test.ok(list.body.related.length == 0 , 'Expected length = 0');
            }
            test.done();
        });

};

exports['describe route "/ping/pong" using method put'] = function (test) {
    var engine = new Engine({
            tables : __dirname + '/mock-routes/tables',
            routes : __dirname + '/mock-routes/routes',
            config : __dirname + '/config/dev.json'
        });
    var q = 'describe route "/ping/pong" using method put';
        engine.exec(q, function(err, list) {

            if (err) {
                 test.fail('got error: ' + err.stack);
            }
            else {
                test.equal(list.body.method,'put');
                test.equal(list.body.path,'/ping/pong');
                test.equal(list.body.about,'/route?path=%2Fping%2Fpong&method=put');
                test.ok(_.isString(list.body.info), 'list.body.info is not array');
                test.ok(list.body.info.length == 0, 'Expected length == 0');
                test.ok(_.isArray(list.body.tables), 'list.body.tables is not array');
                test.ok(list.body.tables.length == 1 , 'Expected length = 1');
                test.ok(_.isArray(list.body.related), 'list.body.related is not array');
                test.ok(list.body.related.length == 1 , 'Expected length = 1');
            }
            test.done();
        }
    );
};

// This method is not supported for the route
exports['describe route "/ping/pong" using method patch'] = function (test) {
    var engine = new Engine({
            tables : __dirname + '/mock-routes/tables',
            routes : __dirname + '/mock-routes/routes',
            config : __dirname + '/config/dev.json'
        });
    var q = 'describe route "/ping/pong" using method patch';
        engine.exec(q, function(err, list) {
            if (err) {
                test.ok('Failed as expected');
            }
            else {
                test.fail('Expected to fail');
            }
            test.done();
        }
    );
};

exports['check routes in desc table'] = function (test) {
    var engine = new Engine({
        tables : __dirname + '/mock-routes/tables',
        routes : __dirname + '/mock-routes/routes',
        config : __dirname + '/config/dev.json'
    });

    var opts = {
        request: {
            headers: {},
            params: {fromRoute: true}
        },
        script: 'describe testing.for.post',
        cb: function(err, list) {

            if (err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                test.equals(list.body.name, 'testing.for.post');
                test.equals(list.body.about, '/table?name=testing.for.post');
                test.ok(list.body.select, 'expected statement select');
                test.equals(list.body.select.method, 'post', 'expected method for statement select');
                test.equals(list.body.select.uri, 'http://localhost:80126/ping/pong', 'expected uri for statement select');
                test.ok(_.isArray(list.body.routes), 'expected list.body.routes to be array');
                test.ok(list.body.routes.length > 0, 'expected list.body.routes to not be empty');
                test.done();
            }
        }
    };

    engine.exec(opts);
};

exports['check table deps for route with insert'] = function (test) {
    var engine = new Engine({
        tables : __dirname + '/mock-routes/tables',
        routes : __dirname + '/mock-routes/routes',
        config : __dirname + '/config/dev.json'
    });

    var opts = {
        request: {
            headers: {},
            params: {fromRoute: true}
        },
        script: 'describe route "/bitly/shorten" using method post',
        cb: function(err, list) {
            if (err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                test.equals(list.body.path, '/bitly/shorten');
                test.equals(list.body.tables[0], '/table?name=bitly.shorten');
                test.done();
            }
        }
    };

    engine.exec(opts);
};

