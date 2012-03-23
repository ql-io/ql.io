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
    crypto = require('crypto');

var Cache = module.exports = function (opts) {

    var memcached = null;

    var DEFAULT_DURATION = 10000;

    this.start = function () {
        if (memcached) {
            return;
        }
        memcached = new (require('memcached'))(opts);
    }

    this.end = function () {
        if (memcached) {
            memcached.end();
            memcached = null;
        }
    }

    this.put = function (key, data, duration, cb) {
        var cacheKey;
        cb = cb || function (err, result) {
        };

        if (!memcached) {
            return cb({message:'Cache not started'})
        }
        if (!key) {
            return cb({message:'No key specified'})
        }

        data = data === undefined || data === null ? '' : data;

        duration = _.isNumber(duration) ? duration : DEFAULT_DURATION;

        cacheKey = crypto.createHash('md5').update(key).digest('hex');

        memcached.set(cacheKey, {key:key, data:data}, duration, function (err, result) {
            if (err) {
                return cb({message:'failed', data:{key:key, data:data, duration:duration}, error:err});
            }
            return cb(null, {message:'success', data:result});
        });
    }


    this.get = function (key, cb) {
        var cacheKey;
        cb = cb || function (err, result) {
        };

        if (!memcached) {
            return cb({message:'Cache not started'})
        }
        if (!key) {
            return cb({message:'No key specified'})
        }

        cacheKey = crypto.createHash('md5').update(key).digest('hex');

        memcached.get(cacheKey, function (err, result) {
            if (err) {
                return cb({message:'failed', data:{key:key}, error:err});
            } else if(result && key === result.key){
                return cb(null, {message:'success', data:result.data});
            } else {
                return cb({message:'failed', data:{key:key}, error:'empty result', result: result});
            }

        });
    }

}
