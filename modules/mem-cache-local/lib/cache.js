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

        data = data === undefined || data === null ? '' : data;

        duration = _.isNumber(duration) ? duration : DEFAULT_DURATION;

        cacheKey = crypto.createHash('md5').update(key).digest('hex');

        memcached.set(cacheKey, {key:key, data:data}, duration, function (err, result) {
            if (err) {
                self.emit(cacheEvents.ERROR, {key:key, error:err});

                return cb({message:'failed', data:{key:key, data:data, duration:duration}, error:err});
            }
            self.emit(cacheEvents.NEW, {key:key, duration:duration});

            return cb(null, {message:'success', data:result});
        });
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

        memcached.get(cacheKey, function (err, result) {
            if (err) {
                self.emit(cacheEvents.MISS, {key:key, error:err});

                return cb({message:'failed', data:{key:key}, error:err});
            } else if (result && key === result.key) {
                self.emit(cacheEvents.HIT, {key:key});

                return cb(null, {message:'success', data:result.data});
            } else {
                self.emit(cacheEvents.MISS, {key:key, error:'unexpected result', result:result});

                return cb({message:'failed', data:{key:key}, error:'unexpected result', result:result});
            }

        });
    }
}

util.inherits(Cache, events.EventEmitter);

Cache.Events = {};
_.extend(Cache.Events, cacheEvents);


