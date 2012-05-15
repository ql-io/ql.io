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
var Cache = require('../lib/cache'),
    util = require('util'),
    _ = require('underscore'),
    fs = require('fs');

exports['1mb-test'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                var eventObj = {};
                eventObj[name] = event;
                events.push(eventObj);
                if (name == Cache.Events.END) {
                    test.deepEqual(events, [
                        { start:{ opts:'127.0.0.1:8026' } },
                        { new:{ key:'1mb-test', duration:100 } },
                        { hit:{ key:'1mb-test' } },
                        { end:undefined }
                    ]);
                    test.done();
                }
            })
        })
        .value();
    cache.start();

    var data = fs.readFileSync(__dirname + '/1mb.txt', 'utf8');

    cache.put('1mb-test', data, 100, function (err, result) {
        if (err) {
            test.ok(false, util.inspect(err, false, null));
        }
        else {
            test.deepEqual(result, { message:'success', data:true });
        }

        cache.get('1mb-test', function (err, result) {
            if (err) {
                test.ok(false, util.inspect(err, false, null));
            }
            else {
                test.deepEqual(result, { message:'success', data:data });
            }
            cache.end();
        });
    });
}

exports['2mb-test'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                var eventObj = {};
                eventObj[name] = event;
                events.push(eventObj);
                if (name == Cache.Events.END) {
                    test.deepEqual(events, [
                        { start:{ opts:'127.0.0.1:8026' } },
                        { new:{ key:'2mb-test', duration:100 } },
                        { hit:{ key:'2mb-test' } },
                        { end:undefined }
                    ]);
                    test.done();
                }
            })
        })
        .value();
    cache.start();

    var data = fs.readFileSync(__dirname + '/2mb.txt', 'utf8');

    cache.put('2mb-test', data, 100, function (err, result) {
        if (err) {
            test.ok(false, util.inspect(err, false, null));
        }
        else {
            test.deepEqual(result, { message:'success', data:true });
        }

        cache.get('2mb-test', function (err, result) {
            if (err) {
                test.ok(false, util.inspect(err, false, null));
            }
            else {
                test.deepEqual(result, { message:'success', data:data });
            }
            cache.end();
        });
    });
}
exports['CategoryService.xml-test'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                var eventObj = {};
                eventObj[name] = event;
                events.push(eventObj);
                if (name == Cache.Events.END) {
                    test.deepEqual(events, [
                        { start:{ opts:'127.0.0.1:8026' } },
                        { new:{ key:'CategoryService.xml-test', duration:100 } },
                        { hit:{ key:'CategoryService.xml-test' } },
                        { end:undefined }
                    ]);
                    test.done();
                }
            })
        })
        .value();
    cache.start();

    var data = fs.readFileSync(__dirname + '/CategoryService.xml', 'utf8');

    cache.put('CategoryService.xml-test', data, 100, function (err, result) {
        if (err) {
            test.ok(false, util.inspect(err, false, null));
        }
        else {
            test.deepEqual(result, { message:'success', data:true });
        }

        cache.get('CategoryService.xml-test', function (err, result) {
            if (err) {
                test.ok(false, util.inspect(err, false, null));
            }
            else {
                test.deepEqual(result, { message:'success', data:data });
            }
            cache.end();
        });
    });
}

