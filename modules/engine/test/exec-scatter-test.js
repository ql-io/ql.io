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
    Engine = require('lib/engine'),
    sys = require('sys'),
    EventEmitter = require('events').EventEmitter();
logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    'connection': 'close'
});

module.exports = {
    'select-times': function(test) {
        var q;
        q = 'select * from scatter where keywords = "ipad"';
        engine.exec(q, function(err, list) {
            if(err) {
                console.log(err.stack || err);
                test.fail('got error: ' + err.stack || err);
                test.done();
            }
            else {
                test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(list.body), 'expected an array');
                test.equals(list.body.length, 30, 'expected 30 items since we scatter three requests');
                test.done();
            }
        });
    },

    'select-context-lookup': function(test) {
        var q;
        q = 'select * from scatter where keywords = "ipad"';
        engine.exec({
            context: {
                times: 2
            },
            script: q,
            cb : function(err, list) {
                if(err) {
                    console.log(err.stack || err);
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(list.body), 'expected an array');
                    test.equals(list.body.length, 20, 'expected 20 items since we scatter three requests');
                    test.done();
                }
            }
        });
    }
}