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
    http = require('http'),
    fs = require('fs'),
    url = require('url'),
    util = require('util');

module.exports = {
    'assign events': function (test) {
        var engine = new Engine({
        });
        var script = fs.readFileSync(__dirname + '/mock/assign-events.ql', 'UTF-8');
        engine.execute(script, function(emitter) {
            var counter = 0;
            emitter.on('a', function(data) {
                test.equal(1, data);
                counter++;
            });
            emitter.on('b', function(data) {
                test.equal('Hello world', data);
                counter++;
            });
            emitter.on('obj', function(data) {
                test.deepEqual({
                  "p1" : "v1",
                  "p2" : {
                      "p3" : "v3",
                      "p4" : "v4"
                  }
                }, data);
                counter++;
            });
            emitter.on('p3', function(data) {
                test.equal('v3', data);
                counter++;
            });
            emitter.on('p4', function(data) {
                test.equal('v4', data);
                counter++;
            });
            emitter.on('end', function(err, result) {
                if(err) {
                    test.fail('Error unexpected');
                    test.done();
                }
                else {
                    test.equal(5, counter);
                    test.equal('Done', result.body);
                    test.done();
                }
            });
        });
    }
}