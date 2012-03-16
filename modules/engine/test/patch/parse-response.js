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

// args.body would be an array of buffers
exports['parse response'] = function(args) {
    assert(typeof args.log === 'function');
    var str = '';
    _.each(args.body, function(buf) {
        str += buf.toString('UTF-8');
    })
    return {
        type: 'application/json',
        content: str
    };
}

exports['patch mediaType'] = function(args) {
    assert(typeof args.log === 'function');
    return args.headers['content-type'];
}