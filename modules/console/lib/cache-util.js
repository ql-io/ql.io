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

var _ = require('underscore');

var startCache = exports.startCache = function (configfile) {
    var ret = null, config;
    if (!configfile) {
        return ret;
    }
    try {
        config = require(configfile) || {};
        if (config.cache && config.cache.impl) {
            var cache;
            var cacheConfig = config.cache.options;
            if (cacheConfig == undefined) {
                cache = new (cacheRequire(config.cache.impl))();
            }
            else {
                cache = new (cacheRequire(config.cache.impl))(cacheConfig);
            }
            if (_.isFunction(cache.start)) {
                cache.start();
            }
            ret = cache;
        }
        return ret;
    }
    catch (e) {
        return ret;
    }
}

var stopCache = exports.stopCache = function(cache){
    if(cache && _.isFunction(cache.stop)){
        cache.stop();
    }
}

function cacheRequire(name){
    var module;
    try{
        module = require(name);
    }
    catch(e){
        try {
            module = require(process.cwd() + '/node_modules/' + name)
        }
        catch(ex){
            throw e;
        }
    }
    return module;
}