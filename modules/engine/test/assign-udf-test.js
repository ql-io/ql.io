/*
 * Copyright 2012 eBay Software Foundation
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
    util = require('util'),
    Engine = require('../lib/engine');

var engine = new Engine();

process.on('uncaughtException', function(error) {
    console.log(error.stack || error);
});
module.exports = {
    'with-args': function(test) {
        var script = 'u = require("./test/udfs/addone.js");\
                      x = 1;\
                      y = 2;\
                      b = u.add(x, y);\
                      return b';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.equals(results.body, 3);
                }
            });
            test.done();
        });
    },
    'no-arg': function(test) {
        var script = 'u = require("./test/udfs/addone.js");\
                      x = 1;\
                      b = u.addonex();\
                      return b';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.equals(results.body, 2);
                }
            });
            test.done();
        });
    },
    'dependency-check': function(test) {
        var script = 'u = require("./test/udfs/addone.js");\
                      b = u.add(x_beta, y_beta);\
                      x = 1;\
                      x_beta = select * from x;\
                      y = 2;\
                      y_beta = select * from y;\
                      return b';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.equals(results.body, 3);
                }
            });
            test.done();
        });
    },
    'direct-pass': function(test) {
        var script = 'u = require("./test/udfs/addone.js");\
                      x = 1;\
                      b = u.add(x, 2);\
                      return b';
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, results) {
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.equals(results.body, 3);
                }
            });
            test.done();
        });
    }
}