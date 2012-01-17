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

var engine = new Engine({
    tables : __dirname + '/tables',
    config : __dirname + '/config/dev.json',
    connection : 'close'
});

exports['show tables'] = function (test) {
    var q = 'show tables';
    engine.exec(q, function(err, list) {

        if (err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
            test.ok(_.isArray(list.body), 'list tables result is not array');
            test.done();
        }
    });
};

exports['show tables - for routes'] = function (test) {
    var opts = {
        request: {
            headers: {},
            params: {fromRoute: true}
        },
        script: 'show tables',
        cb: function(err, list) {

            if (err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                test.ok(_.isArray(list.body), 'list tables result is not array');
                _.each(list.body, function(table){
                    test.ok(table.name, "table 'name' not provided");
                    test.ok(table.about, "table 'about' not provided")
                })
                test.done();
            }
        }
    };

    engine.exec(opts);
};
