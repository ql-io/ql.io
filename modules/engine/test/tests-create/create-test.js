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

var _ = require('underscore'),
    http = require('http'),
    fs = require('fs'),
    util = require('util');;


exports.test = function (test, err, list) {
    if(err) {
        console.log(err.stack || util.inspect(err, false, 10));
        test.fail('got error');
        
    }
    else {
        test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
        test.ok(_.isArray(list.body), 'expected an array');
        test.ok(list.body.length > 0, 'expected some items');
        test.ok(!_.isArray(list.body[0]), 'expected object in the array');
        
    }
}