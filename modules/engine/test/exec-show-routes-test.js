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

var engine = new Engine({
    tables : __dirname + '/mock-routes/tables',
    routes : __dirname + '/mock-routes/routes',
    config : __dirname + '/config/dev.json',
    connection : 'close'
});

var q;
exports['show routes'] = function (test) {
    q = 'show routes';
    engine.exec(q, function(err, list) {

        if (err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
            test.deepEqual(list.body, [
                { method: 'post', route: '/proxy' },
                { method: 'post', route: '/ping/pong' },
                { method: 'put', route: '/ping/pong' },
                { method: 'post', route: '/bing/bong' },
                { method: 'put', route: '/bing/bong' },
                { method: 'post', route: '/ping/pongxml' },
                { method: 'del',
                    route: '/del/foo/bar/{selector}?userid={userId}&itemid={itemId}' },
                { method: 'get',
                    route: '/foo/bar/{selector}?userid={userId}&itemid={itemId}' }]);
            test.done();
        }
    });
};