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
    MutableURI = require('ql.io-mutable-uri'),
    EventEmitter = require('events').EventEmitter,
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

var Listener = require('./utils/log-listener.js');

module.exports = {
    'validator': function(test) {
        var q;
//        The table first doesn't exist'
        q = 'select * from first where keywords = "ipad" and globalid="XYZ"';
        var listener = new Listener(engine, false);
        engine.exec(q, function(err) {
            listener.assert(test);
            if(err) {
                test.ok(true, 'Good.');
                test.done();
            }
            else {
                test.ok(false, 'Expected to fail');
                test.done();
            }
        });
    },
    'only-comments': function(test) {
        var q = " --blah \n     \
                  --blah \n     \
                  -- blah";
        engine.exec(q, function(err, list) {
            test.ok(list.body, {});
        });
        test.ok(true);
        test.done();
    }

}
