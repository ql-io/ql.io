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

var Engine = require('../lib/engine'),
    Listener = require('./utils/log-listener.js'),
    http = require('http'),
    util = require('util');

module.exports = {
    'delete obj': function (test) {
        var script = 'obj = {\
            "a" : "A",\
            "b" : "B",\
            "c" : "C"\
        }\
        return delete from obj where a = "A";';
        var engine = new Engine();
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, result) {
                listener.assert(test);
                if(err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.equals(result.body.a, undefined);
                    test.equals(result.body.b, 'B');
                    test.equals(result.body.c, 'C');
                    test.done();
                }
            });
        });
    },
    'delete arr and': function (test) {
        var script = 'arr = [\
                    {"key" : 1, "color": "red"},\
                    {"key" : 2, "color": "green"},\
                    {"key" : 3, "color": "red"},\
                    {"key" : 4}]\
                    narr = delete from arr where key = 1 and color = "red";\
                    return narr;';
        var engine = new Engine();
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, result) {
                listener.assert(test);
                if(err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.equals(result.body.length, 3);
                    test.deepEqual(result.body, [
                        {
                            "key": 2, "color": "green"
                        },
                        {
                            "key": 3, "color": "red"
                        },
                        {
                            "key": 4
                        }
                    ]);
                    test.done();
                }
            });
        });
    },
    'delete arr and multival': function (test) {
        var script = 'colors = ["red", "green"];\
                arr = [\
                {"key" : 1, "color": "red"},\
                {"key" : 2, "color": "green"},\
                {"key" : 3, "color": "red"},\
                {"key" : 4}]\
                narr = delete from arr where key = 1 and color = "{colors}";\
                return narr;';
        var engine = new Engine();
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, result) {
                listener.assert(test);
                if(err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.equals(result.body.length, 3);
                    test.deepEqual(result.body, [
                        {
                            "key": 2, "color": "green"
                        },
                        {
                            "key": 3, "color": "red"
                        },
                        {
                            "key": 4
                        }
                    ]);
                    test.done();
                }
            });
        });
    },
    'delete arr and in': function (test) {
        var script = 'colors = ["red", "green"];\
                    arr = [\
                    {"key" : 1, "color": "red"},\
                    {"key" : 2, "color": "green"},\
                    {"key" : 3, "color": "red"},\
                    {"key" : 4}]\
                    narr = delete from arr where key = 1 and color in "{colors}";\
                    return narr;';
        var engine = new Engine();
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, result) {
                listener.assert(test);
                if(err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.equals(result.body.length, 3);
                    test.deepEqual(result.body, [
                        {
                            "key": 2, "color": "green"
                        },
                        {
                            "key": 3, "color": "red"
                        },
                        {
                            "key": 4
                        }
                    ]);
                    test.done();
                }
            });
        });
    },
    'delete arr ret': function (test) {
        var script = 'arr = [\
            {"key" : 1},\
            {"key" : 2},\
            {"key" : 3},\
            {"key" : 4}]\
            return delete from arr where key = 1;';
        var engine = new Engine();
        var listener = new Listener(engine);
        engine.execute(script, function (emitter) {
            emitter.on('end', function (err, result) {
                listener.assert(test);
                if(err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');
                    test.done();
                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.equals(result.body.length, 3);
                    test.deepEqual(result.body, [
                        {
                            "key": 2
                        },
                        {
                            "key": 3
                        },
                        {
                            "key": 4
                        }
                    ]);
                    test.done();
                }
            });
        });
    },
    'delete': function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            util.pump(req, res, function (e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                tables: __dirname + '/delete'
            });
            var listener = new Listener(engine);
            engine.execute('delete from delete.test where name = 101', function (emitter) {
                listener.assert(test);
                emitter.on('end', function (err, result) {
                    if(err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.equals(result.body.name, 101);
                        test.done();
                    }
                    server.close();
                });
            });
        });
    }
};