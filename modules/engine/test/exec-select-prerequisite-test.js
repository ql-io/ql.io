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
    'select with required key missing': function(test) {
        var q;
        q = 'first = {"keywords": "iphone"};' +
            'return select * from first where keywords = "{^key}"';
        var listener = new Listener(engine, false);
        engine.exec(q, function(err, result) {
            listener.assert(test);
            if(err){
                test.fail("Unexpected failure");
            }
            else {
                test.deepEqual(result, { headers: { 'content-type': 'application/json' }, body: null});
            }
            test.done();
        });
    },
    'select with required key not missing': function(test) {
        var q;
        q = 'key = "iphone"; ' +
            'first = [{"keywords": "iphone"},{"keywords": "iphone"}]; ' +
            'return select * from first where keywords = "{^key}";';
        var listener = new Listener(engine, false);
        engine.exec(q, function(err, result) {
            listener.assert(test);
            if(err){
                test.fail("Unexpected failure");
            }
            else {
                test.deepEqual(result, { headers: { 'content-type': 'application/json' },
                    body: [ { keywords: 'iphone' }, { keywords: 'iphone' } ] });
            }
            test.done();
        });
    },
    'select-join-in-and key missing' : function(test) {
        var script = 'b = [{"id": "1", "name": "abc"}, {"id": "2", "name": "def"}];\
                              return select * from b where id in ("{^a}") and name = "def";';
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, list) {
                listener.assert(test);
                if(err){
                    test.fail('got error: ' + err.stack || err);
                }
                else {
                    test.deepEqual(list, { headers: { 'content-type': 'application/json' }, body: null });
                }
                test.done();
            });
        })
    },
    'select-join-in-and key not missing' : function(test) {
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
    'select-join-n-rows key missing': function(test) {
        var script = 'a = [{"x":"x", "id":"1"}];\
                      b = [{"id":"1", "y":"y1"},{"id":"1", "y":"y2"}];\
                      return select a.id, b.y from a as a, b  as b where b.id=a.id and b.y="{^v}";';
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
                    test.equal(list.body, null);
                    test.done();
                }
            });
        })
    },
    'select-join-n-rows key not missing': function(test) {
        var script = 'v = "y1"\
                      a = [{"x":"x", "id":"1"}];\
                      b = [{"id":"1", "y":"y1"},{"id":"1", "y":"y2"}];\
                      return select a.id, b.y from a as a, b  as b where b.id=a.id and b.y="{^v}";';
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, list) {
                listener.assert(test);
                if(err) {
                    console.log(err.stack || err);
                    test.fail('got error: ' + err.stack || err);
                    test.done();
                }
                else {
                    test.equals(list.headers['content-type'], 'application/json', 'JSON expected');
                    test.deepEqual(list.body.length, 1);
                    test.deepEqual(list.body, [[ '1', 'y1' ]]);
                    test.done();
                }
            });
        })
    },
    'delete with required key missing': function(test) {
        var q;
        q = "delete from ebay.item where itemId = '{^abcd}' timeout 10 minDelay 100 maxDelay 10000";
        var listener = new Listener(engine, false);
        engine.exec(q, function(err, result) {
            listener.assert(test);
            if(err){
                test.fail("Unexpected failure");
            }
            else {
                test.deepEqual(result, { headers: { 'content-type': 'application/json' }, body: null });
            }
            test.done();
        });
    }
}
