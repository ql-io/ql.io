/*
 * Copyright 2013 eBay Software Foundation
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
var fs = require('fs'),
    assert = require('assert');
exports.load = function (opts) {
    var rootdir = opts.path;
    var logEmitter = opts.logEmitter;

    if(!rootdir) {
        return [];
    }
    var connectors = {};

    logEmitter.emitEvent('Loading connectors from ' + rootdir);
    loadInternal(rootdir, '', logEmitter, connectors);
    return connectors;

};

function loadInternal(path, prefix, logEmitter, connectors) {
    assert.ok(path, 'path should not be null');
    assert.ok(connectors, 'connectors should not be null');

    var stats, paths;
    path = path.charAt(path.length - 1) == '/' ? path : path + '/';
    try {
        paths = fs.readdirSync(path);
    }
    catch(e) {
        logEmitter.emitError('Unable to load connectors from ' + path);
        return;
    }

    paths.forEach(function(filename) {
        stats = fs.statSync(path + filename);
        /*if(stats.isDirectory()) {
            loadInternal(path + filename,
                prefix.length > 0 ? prefix + '.' + filename : filename,
                logEmitter, connectors);
        }
        else */if(stats.isFile() && /\.js$/.test(filename)) {
           loadOne(path+filename,connectors)

        }
    });
}

function loadOne(filepath, connectors){
    try{
        var candidate = require(filepath);
        var connectorName = candidate.connectorName;
        if(connectorName){
            connectors[connectorName] = filepath
        }
    }catch(e){}

}
