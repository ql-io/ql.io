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
var Cache = require('../lib/cache')
util = require('util'),
    _ = require('underscore');

exports['life-cycle'] = function (test) {
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
                        { new:{ key:'key1', duration:100 } },
                        { hit:{ key:'key1' } },
                        { end:undefined }
                    ]);
                    test.done();
                }
            })
        })
        .value();
    cache.start();

    cache.put('key1', 'Key1Value', 100, function (err, result) {
        if (err) {
            test.ok(false, util.inspect(err, false, null));
        }
        else {
            test.deepEqual(result, { message:'success', data:true });
        }

        cache.get('key1', function (err, result) {
            if (err) {
                test.ok(false, util.inspect(err, false, null));
            }
            else {
                test.deepEqual(result, { message:'success', data:'Key1Value' });
            }
            cache.end();
        });
    });
}

exports['cache-interval'] = function (test) {
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
                        { new:{ key:'key2', duration:1 } },
                        { miss:{ key:'key2', error:'unexpected result', result:false } },
                        { end:undefined }
                    ]);
                    test.done();
                }
            })
        })
        .value();
    cache.start();

    cache.put('key2', 'Key2Value', 1, function (err, result) {
        if (err) {
            test.ok(false, util.inspect(err, false, null));
        }
        else {
            test.deepEqual(result, { message:'success', data:true });
        }
    });

    setTimeout(function () {
        cache.get('key2', function (err, result) {
            if (err) {
                test.deepEqual({ message:'failed',
                    data:{ key:'key2' },
                    error:'unexpected result',
                    result:false }, err);
            }
            else {
                test.ok(false, result);
            }
            cache.end();
        });
    }, 1005);
}

exports['key-miss'] = function (test) {
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
                        { miss:{ key:'key3', error:'unexpected result', result:false } },
                        { end:undefined }
                    ]);
                    test.done();
                }
            })
        })
        .value();
    cache.start();

    cache.get('key3', function (err, result) {
        if (err) {
            test.deepEqual({ message:'failed',
                data:{ key:'key3' },
                error:'unexpected result',
                result:false }, err);
        }
        else {
            test.ok(false, result);
        }
        cache.end();
    });
}

exports['start-not-called-get'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                var eventObj = {};
                eventObj[name] = event;
                events.push(eventObj);
            })
        })
        .value();
    cache.get('key3', function (err, result) {
        if (err) {
            test.equal(err.message, 'Cache not started');
            test.deepEqual(events, [
                { error:{ key:'key3', error:'Cache not started - get failed' } }
            ]);
        }
        else {
            test.ok(false, result);
        }
    });
    test.done();
}

exports['start-not-called-put'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                var eventObj = {};
                eventObj[name] = event;
                events.push(eventObj);
            })
        })
        .value();
    cache.put('key3', 'key3Value', 100, function (err, result) {
        if (err) {
            test.equal(err.message, 'Cache not started');
            test.deepEqual(events, [
                { error:{ key:'key3', error:'Cache not started - put failed' } }
            ]);
            test.done();
        }
        else {
            test.ok(false, result);
            test.done();
        }
    });
}

exports['key-not-passed-get'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                var eventObj = {};
                eventObj[name] = event;
                events.push(eventObj);
            })
        })
        .value();
    cache.start();
    cache.get(null, function (err, result) {
        if (err) {
            test.equal(err.message, 'No key specified');
            test.deepEqual(events, [
                { start:{ opts:'127.0.0.1:8026' } },
                { error:{ error:'No key specified - get failed' } }
            ]);
            test.done();
            cache.end();
        }
        else {
            test.ok(false, result);
            test.done();
            cache.end();
        }
    });
}

exports['key-not-passed-put'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                var eventObj = {};
                eventObj[name] = event;
                events.push(eventObj);
            })
        })
        .value();
    cache.start();
    cache.put(null, 'key3Value', 100, function (err, result) {
        if (err) {
            test.equal(err.message, 'No key specified');
            test.deepEqual(events, [
                { start:{ opts:'127.0.0.1:8026' } },
                { error:{ error:'No key specified - put failed' } }
            ]);
            test.done();
            cache.end();
        }
        else {
            test.ok(false, result);
            test.done();
            cache.end();
        }
    });
}

function verifyGoodStats(test, event, statsFields) {
    test.ok(event.heartbeat);
    test.ok(event.heartbeat.data);
    test.ok(event.heartbeat.data[0]);
    test.ok(event.heartbeat.data[0].server && event.heartbeat.data[0].server == '127.0.0.1:8026');
    _.each(statsFields, function (field) {
        test.ok(event.heartbeat.data[0][field] != undefined);
    })
}
exports['heart-beat'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];
    var statsFields = [
        "pid",
        "uptime",
        "time",
        "version",
        "pointer_size",
        "rusage_user",
        "rusage_system",
        "curr_items",
        "total_items",
        "bytes",
        "curr_connections",
        "total_connections",
        "connection_structures",
        "reserved_fds",
        "cmd_get",
        "cmd_set",
        "cmd_flush",
        "cmd_touch",
        "get_hits",
        "get_misses",
        "evictions",
        "bytes_read",
        "bytes_written",
        "limit_maxbytes",
        "conn_yields",
        "hash_power_level",
        "hash_bytes",
        "hash_is_expanding",
        "expired_unfetched",
        "evicted_unfetched"
    ];

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                var eventObj = {};
                eventObj[name] = event;
                events.push(eventObj);
                if (name == Cache.Events.END) {
                    test.deepEqual(events[0],{ start: { opts: '127.0.0.1:8026' } });
                    verifyGoodStats(test, events[1], statsFields);
                    verifyGoodStats(test, events[events.length/2], statsFields);
                    verifyGoodStats(test, events[events.length-2], statsFields);
                    test.deepEqual(events[events.length-1],{ end: undefined } );
                    test.done();
                }
            })
        })
        .value();
    cache.start(100); // frequent heartbeat

    setTimeout(function () {
        cache.end();
    }, 1005);
}

// This Test doesn't terminate for a long time .. hence commented out .. also a bug in memcached lib
// When server is not connected "ever" and when memcached needs to disable it.
// TODO: File memecached issue
//
//exports['heart-beat-cachedown'] = function (test) {
//    var cache = new Cache({config: 'localhost:11212'});
//    var events = [];
//    _.chain(Cache.Events)
//        .values()
//        .each(function (name) {
//            cache.on(name, function (event) {
//                var eventObj = {};
//                eventObj[name] = event;
//                events.push(eventObj);
//                if (name == Cache.Events.END) {
//                    test.deepEqual(events[0],{ start: { opts: {config: 'localhost:11212'} } });
//                    test.deepEqual(events[1], { heartbeat: { data: [] } });
//                    test.deepEqual(events[events.length/2], { heartbeat: { data: [] } });
//                    test.deepEqual(events[events.length-2], { heartbeat: { data: [] } });
//                    test.deepEqual(events[events.length-1],{ end: undefined } );
//                    test.done();
//                }
//            })
//        })
//        .value();
//    cache.start(100); // frequent heartbeat
//
//    setTimeout(function () {
//        cache.end();
//    }, 1005);
//
//}