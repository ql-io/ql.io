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

exports['show routes test'] = function (test) {
    var engine = new Engine({
        tables : __dirname + '/mock-routes/tables',
        routes : __dirname + '/mock-routes/routes',
        config : __dirname + '/config/dev.json',
        connection : 'close'
    });
    var q = 'show routes';
    engine.exec(q, function(err, list) {

        if (err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
            console.log(list.body);
            test.ok(_.isArray(list.body), 'show routes result is not array');
            test.ok(list.body.length == 8, 'Expected length 8 got ' + list.body.length);
            test.done();
        }
    });
};

exports['show routes with no routes test'] = function (test) {
    var engine = new Engine({
        tables : __dirname + '/mock-routes/tables',
        config : __dirname + '/config/dev.json',
        connection : 'close'
    });
    var q = 'show routes';
    engine.exec(q, function(err, list) {

        if (err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
            test.deepEqual(list.body, []);
            test.done();
        }
    });
};