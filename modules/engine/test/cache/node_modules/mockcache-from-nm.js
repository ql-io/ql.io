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
var util = require('util'),
    events = require('events');

var Cache = module.exports = function (opts) {
    events.EventEmitter.call(this);

    var theCache = {};
    this.start = function () {
    }

    this.end = function () {
    }

    this.put = function (key, data, duration, cb) {
        cb = cb || function (err, result) {
        };

        if (!key) {
            cb({message:'No key specified'})
        }

        theCache[key] = data;

        cb(null, {message:'success', data:true});
    }


    this.get = function (key, cb) {
        cb = cb || function (err, result) {
        };

        var result = theCache[key];

        if (result === undefined) {
            return cb(null, {message:'success', data:false});
        }

        cb(null, {message:'success', data:result});
    }
}

util.inherits(Cache, events.EventEmitter);
