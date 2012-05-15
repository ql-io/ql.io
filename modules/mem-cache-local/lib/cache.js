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

/**
 * This module provides a interface over memcached
 */

'use strict';

var _ = require('underscore'),
    crypto = require('crypto'),
    util = require('util'),
    events = require('events'),
    cacheEvents = require('./events');

var Cache = module.exports = function (opts) {

    events.EventEmitter.call(this);

    var memcached = null;

    var DEFAULT_DURATION = 10000;

    var FIXED_HEARTBEAT_INTERVAL = 300000; //5 Mins

    var MAX_SLICE_SIZE = 1024000; // 1 meg is data limit (keep slightly less than 1 meg)

    var SLICE_OVERHEAD = 100; // Braces, Quotes, etc save with every slice

    var heartbeat = null;

    var self = this;

    function doHeartbeat() {
        memcached.stats(function (err, result) {
            if (err && err.error && (err.error != {} && err.error != [])) {
                self.emit(cacheEvents.ERROR, {error:err});
            }
            self.emit(cacheEvents.HEART_BEAT, {data:result});
        });
    }

    this.start = function (heartBeatInternal) {
        if (memcached) {
            return;
        }
        if (_.isObject(opts) && opts.config) {
            memcached = new (require('memcached'))(opts.config, opts.options);
        }
        else {
            memcached = new (require('memcached'))(opts);
        }

        memcached.on('issue', function(details){
            self.emit(cacheEvents.ERROR, {error:'connection issue', details: details});
        });

        memcached.on('failure', function(details){
            self.emit(cacheEvents.ERROR, {error:'connection failure', details: details});
        });

        memcached.on('reconnecting', function(details){
            self.emit(cacheEvents.INFO, {error:'connection retry', details: details});
        });

        memcached.on('reconnected', function(details){
            self.emit(cacheEvents.INFO, {error:'connection re-established', details: details});
        });

        memcached.on('remove', function(details){
            self.emit(cacheEvents.ERROR, {error:'connection removed', details: details});
        });


        self.emit(cacheEvents.START, {opts:opts});

        heartbeat = setInterval(doHeartbeat, heartBeatInternal || FIXED_HEARTBEAT_INTERVAL);
    }

    this.end = function () {
        if (memcached) {
            memcached.end();
            memcached = null;
            self.emit(cacheEvents.END);
            clearInterval(heartbeat);
        }
    }

    function saveSliceBySlice(cacheKey, count, key, dataStr, numSlices, dataSliceSize, duration, cb) {
        memcached.set(cacheKey + count, dataStr.substr(count * dataSliceSize, dataSliceSize), duration,
            function (err, result) {
                if (err || !result) {
                    self.emit(cacheEvents.ERROR, {key:key, error:err || "unknown"});
                    return cb({message:'failed', data:{key:key, data:dataStr, duration:duration}, error:err
                        || "unknown"});
                }
                count++;
                if (count == numSlices) {
                    self.emit(cacheEvents.NEW, {key:key, duration:duration});
                    return cb(null, {message:'success', data:result});
                }
                else {
                    return saveSliceBySlice(cacheKey, count, key, dataStr, numSlices, dataSliceSize, duration, cb);
                }
            });
    }

    function fetchSliceBySlice(cacheKey, count, key, slices, numSlices, cb) {
        if (count == numSlices) {
            var dataStr = slices.join('');
            try {
                var result = JSON.parse(dataStr);
                self.emit(cacheEvents.HIT, {key:key});
                return cb(null, {message:'success', data:result});
            }
            catch (e) {
                self.emit(cacheEvents.MISS, {key:key, error:e});
                return cb({message:'failed - bad JSON', data:{key:key}, error:e});
            }
        }
        else {
            memcached.get(cacheKey + count, function (err, slice) {
                if (err) {
                    self.emit(cacheEvents.MISS, {key:key, error:err});
                    return cb({message:'failed', data:{key:key}, error:err});
                }
                else if (slice) {
                    slices.push(slice);
                    return fetchSliceBySlice(cacheKey, count+1, key, slices, numSlices, cb);
                }
                else {
                    self.emit(cacheEvents.MISS, {key:key, error:'unexpected result', result:slice});
                    return cb({message:'failed', data:{key:key}, error:'unexpected result', result:slice});
                }
            });
        }
    }

    this.put = function (key, data, duration, cb) {
        var cacheKey;
        cb = cb || function (err, result) {
        };

        if (!memcached) {
            self.emit(cacheEvents.ERROR, {key:key, error:'Cache not started - put failed'});

            return cb({message:'Cache not started'})
        }
        if (!key) {
            self.emit(cacheEvents.ERROR, {error:'No key specified - put failed'});

            return cb({message:'No key specified'})
        }

        if(key.length + SLICE_OVERHEAD >= MAX_SLICE_SIZE){
            self.emit(cacheEvents.ERROR, {error:'key is too large'});

            return cb({message:'key is too large'})
        }

        data = data === undefined || data === null ? '' : data;

        duration = _.isNumber(duration) ? duration : DEFAULT_DURATION;

        cacheKey = crypto.createHash('md5').update(key).digest('hex');

        var dataStr = JSON.stringify(data);

        if(dataStr.length > MAX_SLICE_SIZE){
            var dataSliceSize = MAX_SLICE_SIZE - key.length - SLICE_OVERHEAD;
            var numSlices = Math.ceil(dataStr.length/dataSliceSize);

            memcached.set(cacheKey, {key:key, slices:numSlices}, duration, function(err, result){
                if(err || !result){

                    self.emit(cacheEvents.ERROR, {key:key, error: err || "unknown"});

                    return cb({message:'failed storing slice info for large data',
                        data:{key:key, data:data, duration:duration}, error: err
                        || "unknown"});
                }

                return saveSliceBySlice(cacheKey, 0, key, dataStr, numSlices, dataSliceSize, duration, cb);
            });

        }
        else {
            memcached.set(cacheKey, {key:key, data:dataStr}, duration, function (err, result) {
                if (err || !result) {
                    self.emit(cacheEvents.ERROR, {key:key, error: err || "unknown"});

                    return cb({message:'failed', data:{key:key, data:data, duration:duration}, error:err || "unknown"});
                }

                self.emit(cacheEvents.NEW, {key:key, duration:duration});

                return cb(null, {message:'success', data:result});
            });
        }
    }


    this.get = function (key, cb) {
        var cacheKey;
        cb = cb || function (err, result) {
        };

        if (!memcached) {
            self.emit(cacheEvents.ERROR, {key:key, error:'Cache not started - get failed'});

           return cb({message:'Cache not started'})
        }
        if (!key) {
            self.emit(cacheEvents.ERROR, {error:'No key specified - get failed'});

            return cb({message:'No key specified'})
        }

        cacheKey = crypto.createHash('md5').update(key).digest('hex');

        memcached.get(cacheKey, function (err, cacheValue) {
            if (err) {
                self.emit(cacheEvents.MISS, {key:key, error:err});

                return cb({message:'failed', data:{key:key}, error:err});
            } else if (cacheValue && cacheValue.data) {
                var result;
                try {
                    result = JSON.parse(cacheValue.data);
                    if (key === cacheValue.key) {
                        self.emit(cacheEvents.HIT, {key:key});
                        return cb(null, {message:'success', data:result});
                    }
                    self.emit(cacheEvents.MISS, {key:key, error:'unexpected result - md5 collusion',
                        result:cacheValue});
                    return cb({message:'failed', data:{key:key}, error:'unexpected result - md5 collusion',
                        result:cacheValue});
                }
                catch(e){
                    self.emit(cacheEvents.MISS, {key:key, error:e, result:cacheValue});
                    return cb({message:'failed', data:{key:key}, error:e, result:cacheValue});
                }
            } else if(cacheValue && cacheValue.slices != undefined){ // using undefined because slices is number
                if (key != cacheValue.key) {
                    self.emit(cacheEvents.MISS, {key:key, error:'unexpected result - md5 collusion',
                        result:cacheValue});
                    return cb({message:'failed', data:{key:key}, error:'unexpected result - md5 collusion',
                        result:cacheValue});
                }
                var slices = [];
                return fetchSliceBySlice(cacheKey, 0, key, slices, cacheValue.slices, cb);
            }
            else {
                self.emit(cacheEvents.MISS, {key:key, error:'unexpected result', result:cacheValue});
                return cb({message:'failed', data:{key:key}, error:'unexpected result', result:cacheValue});
            }

        });
    }
}


util.inherits(Cache, events.EventEmitter);

Cache.Events = {};
_.extend(Cache.Events, cacheEvents);


