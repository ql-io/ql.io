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
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

exports['describe'] = function (test) {
    var q = 'describe ebay.finding.items';
    engine.exec(q, function(err, list) {
        if (err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.equals(list.headers['content-type'], 'text/html', 'HTML expected');
            test.done();
        }
    });
};

exports['describe - for routes'] = function (test) {
    var opts = {
        request: {
            headers: {},
            params: {fromRoute: true}
        },
        script: 'describe ebay.finding.items',
        cb: function(err, list) {

            if (err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                test.equals(list.body.name, 'ebay.finding.items');
                test.equals(list.body.about, '/table?name=ebay.finding.items');
                test.ok(list.body.select, "expected statement select");
                test.ok(list.body.select.request, "expected request for statement select");
                test.ok(list.body.select.params, "expected params for statement select");
                test.done();
            }
        }
    };

    engine.exec(opts);
};
