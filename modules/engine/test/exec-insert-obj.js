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
    Listener = require('./utils/log-listener.js'),
    http = require('http'),
    fs = require('fs'),
    url = require('url'),
    util = require('util');

module.exports = {
    'assign events': function (test) {
        var engine = new Engine({
        });
        var script = fs.readFileSync(__dirname + '/mock/insert-obj.ql', 'UTF-8');
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            listener.assert(test);
            emitter.on('end', function (err, result) {
                if(err) {
                    console.log(err.stack || err);
                    test.fail('Error unexpected');
                    test.done();
                }
                else {
                    test.deepEqual({
                        "p3": "v3",
                        "p4": "v4",
                        "p5": "v5",
                        "p6": "v6"
                    }, result.body);
                    test.done();
                }
            });
        });
    }
}