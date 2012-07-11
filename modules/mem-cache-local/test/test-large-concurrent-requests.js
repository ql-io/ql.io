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

exports['concurrent-flooding'] = function (test) {
    var cache = new Cache('127.0.0.1:8026');
    var events = [];
    var count = {
        start: 0,
        new: 0,
        hit: 0,
        end: 0,
        miss: 0
    };

    var concurrency = 25;

    _.chain(Cache.Events)
        .values()
        .each(function (name) {
            cache.on(name, function (event) {
                count[name]++;
                if (name == Cache.Events.END) {
                    test.deepEqual(count, {start:1, new:concurrency, hit:concurrency, end:1, miss:0});
                    test.done();
                }
            })
        })
        .value();
    cache.start();

    var data = fs.readFileSync(__dirname + '/1mb.txt', 'utf8');

    var done = 0;
    for (var i = 0; i < concurrency; i++) {
        cache.put('1mb-test'+i, data, 100, function (err, result) {
            if (err) {
                test.ok(false, util.inspect(err, false, null));
            }
            else {
                test.deepEqual(result, { message:'success', data:true });
            }
            done++;
            if(done === concurrency){
                done = 0;
                for(var j=0; j<concurrency; j++){
                    cache.get('1mb-test'+j, function (err, result) {
                        if (err) {
                            test.ok(false, util.inspect(err, false, null));
                        }
                        else {
                            test.deepEqual(result, { message:'success', data:data });
                        }
                        done++;
                        if(done == concurrency) {
                            cache.end();
                        }
                    });
                }
            }
        });
    }
}
