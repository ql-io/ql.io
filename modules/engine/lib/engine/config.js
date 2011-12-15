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

/**
 * Loads config
 */

'use strict';

var fs = require('fs'),
    logEmitter =  require('./log-emitter.js');

exports.load = function(opts) {
    opts = opts || {};
    var file = opts.config, text;

    if(!file) {
        return {};
    }
    try {
        // Load the file
        text = fs.readFileSync(file, 'UTF-8');
    }
    catch (e) {
        logEmitter.emitError('Unable to load config from ' + file);
        return {};
    }

    try {
        return JSON.parse(text);
    }
    catch (e) {
        logEmitter.emitError('Error loading config file: ' + file);
        console.log(e.stack || e);
        return {};
    }
}
