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
    'naive': function (test) {
        var engine = new Engine({
        });
        var script = fs.readFileSync(__dirname + '/mock/update-obj.ql', 'UTF-8');
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            listener.assert(test);
            emitter.on('end', function (err, result) {
                if(err) {
                    test.fail('Error unexpected');
                    test.done();
                }
                else {
                    test.deepEqual([ { name: 'John', age: 34 }, { name: 'Mary', age: 99 } ], result.body);
                    test.done();
                }
            });
        });
    },
    'nested': function (test) {
        var engine = new Engine({
        });
        var script = fs.readFileSync(__dirname + '/mock/update-nested.ql', 'UTF-8');
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            listener.assert(test);
            emitter.on('end', function (err, result) {
                if(err) {
                    test.fail('Error unexpected');
                    test.done();
                }
                else {
                    test.deepEqual([
                        {
                            "id" : 1,
                            "prop" : {
                                "id" : 3
                            }
                        },
                        {
                            "id" : 2,
                            "prop" : {
                                "id" : 100002
                            }
                        },
                        {
                            "id" : 3,
                            "prop" : {
                                "id" : 3
                            }
                        }
                    ], result.body);
                    test.done();
                }
            });
        });
    }
}