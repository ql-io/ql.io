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
var j = require('JSONPath');

// Select/reject a row
exports.matchKeys = function(name) {
    console.log('name: ' + name);
    var keys = [];
    var names = j.eval(this.row[1], '$..name');
//    console.log('names ' + names);
    var found = false;
//    for(var i = 0; i < names.length; i++) {
//        if(keys[this.index].indexOf(names[i]) > -1) {
//            found = true;
//            break;
//        }
//    }
//    console.log('found: ' + found);
    return this.next(null, found ? this.row : null);
}