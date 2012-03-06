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

var fs = require('fs');

// Utility to ensure that certain directories exist
exports.ensureDir = function(dir, clean) {
    try {
        fs.readdirSync(dir);
        if(clean) {
            var paths = fs.readdirSync(dir);
            paths.forEach(function(filename) {
                try {
                    fs.unlink(dir + '/' + filename);
                }
                catch(e) {}
            });
        }
    }
    catch(e) {
        fs.mkdirSync(dir, 0755);
    }
}

exports.forMemoryNum = function(memory) {
    var strMemory;
    if(memory < 1024) {
        strMemory = memory + ' Bytes';
    }
    if(memory < 1024 * 1024) {
        strMemory = (memory / 1024).toFixed(2) + ' KB';
    }
    else {
        strMemory = (memory / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return strMemory;
}
