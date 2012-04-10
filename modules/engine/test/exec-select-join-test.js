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
    fs = require('fs'),
    util = require('util'),
    Listener = require('./utils/log-listener.js');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

module.exports = {
    'select-join-array-object' : function(test) {
        fs.readFile(__dirname + '/mock/join-array-object.ql', 'UTF-8', function(err, script) {
            var listener = new Listener(engine);
            engine.exec(script, function (err, list) {
                listener.assert(test);
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.ok(list.body.j1);
                    test.equals(list.body.j1.length, 2);
                    test.ok(list.body.j2);
                    test.equals(list.body.j2.length, 1);
                    test.done();
                }
            });
        })
    },

    'select-join-in' : function(test) {
        var script = 'a = ["1", "2"];\
                      b = [{"id": "1", "name": "abc"}];\
                      return select * from b where id in ("{a}");';
        engine.execute(script, function(emitter) {
            var listener = new Listener(engine);
            emitter.on('end', function(err, list) {
                listener.assert(test);
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.deepEqual(list.body, [{id: 1, name: 'abc'}]);
                    test.done();
                }
            });
        })
    },

    'select-join-in-2' : function(test) {
        var script = 'a = ["1", "2"];\
                          b = [{"id": "1", "name": "abc"}, {"id": "2", "name": "def"}];\
                          return select * from b where id in ("{a}");';
        engine.execute(script, function (emitter) {
            var listener = new Listener(engine);
            emitter.on('end', function (err, list) {
                listener.assert(test);
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.deepEqual(list.body, [
                        {id: 1, name: 'abc'},
                        {id: 2, name: 'def'}
                    ]);
                    test.done();
                }
            });
        })
    },

    'select-join-in-and' : function(test) {
        var script = 'a = ["1", "2"];\
                              b = [{"id": "1", "name": "abc"}, {"id": "2", "name": "def"}];\
                              return select * from b where id in ("{a}") and name = "def";';
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, list) {
                listener.assert(test);
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.deepEqual(list.body, [
                        {id: 2, name: 'def'}
                    ]);
                    test.done();
                }
            });
        })
    },

    'select-join-in-and-2' : function(test) {
        var script = 'a = ["1", "3"];\
                              b = [{"id": "1", "name": "abc"}, {"id": "2", "name": "def"}, {"id": "3", "name": "ghi"}];\
                              return select * from b where id in ("{a}") and name = "def";';
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, list) {
                listener.assert(test);
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.deepEqual(list.body, []);
                    test.done();
                }
            });
        });
    },

    'select-join-n-rows': function(test) {
        var script = 'a = [{"x":"x", "id":"1"}];\
                      b = [{"id":"1", "y":"y1"},{"id":"1", "y":"y2"}];\
                      return select a.id, b.y from a as a, b  as b where b.id=a.id;';
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, list) {
                listener.assert(test);
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.deepEqual(list.body.length, 2);
                    test.deepEqual(list.body, [
                        ["1", "y1"],
                        ["1", "y2"]
                    ]);
                    test.done();
                }
            });
        })
    },

    'select-join-n-rows-with-alias': function(test) {
       var script = 'a = [{"x":"x", "id":"1"}];\
                     b = [{"id":"1", "y":"y1"},{"id":"1", "y":"y2"}];\
                     return select a.id as a, b.y as y from a as a, b  as b where b.id=a.id;';
       var listener = new Listener(engine);
       engine.execute(script, function (emitter) {
           emitter.on('end', function (err, list) {
               listener.assert(test);
               if(err) {
                   test.fail('got error: ' + err.stack || err);
                   test.done();
               }
               else {
                   test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                   test.deepEqual(list.body.length, 2);
                   test.deepEqual(list.body, [
                       {
                           "a": "1",
                           "y": "y1"
                       },
                       {
                           "a": "1",
                           "y": "y2"
                       }
                   ]);
                   test.done();
               }
           });
       })
   }
}