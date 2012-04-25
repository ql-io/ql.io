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
    _ = require('underscore');

exports.echo = function() {
    return this.next(null, Array.prototype.slice.call(arguments));
}

exports.thru = function() {
    return this.next(null, this.row);
}

exports.append = function() {
    this.row = this.row.concat(Array.prototype.slice.call(arguments));
    return this.next(null, this.row);
}

exports.appendFields = function() {
    var args = Array.prototype.slice.call(arguments);
    var self = this;
    _.each(args, function(arg, i) {
        self.row['arg' + i] = arg;
    });
    return this.next(null, this.row);
}

// Check whether a row should be included or not. Also tweak its fields.
exports.filterRow = function(keys) {
    var found = false;
    var details = [];
    for(var i = 0; i < this.row[1].length; i++) {
        for(var j = 0; j < keys.length; j++) {
            if(keys[j].name === this.row[1][i].name) {
                details.push(this.row[1][i]);
                found = true;
                break;
            }
        }
    }
    if(found) {
        this.row[1] = details;
    }
    // if null, this row will be excluded from results
    return this.next(null, found ? this.row : null);
};