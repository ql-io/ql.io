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

"use strict";

var fs = require('fs'),
    logUtil = require('./log-util.js');

exports.load = function(opts) {
    opts = opts || {};
    var logger = global.opts.logger;
    var file = opts.config, text, data = {};

    if(file) {
        try {
            // Load the file
            text = fs.readFileSync(file, 'UTF-8');
        }
        catch(e) {
            logger.error('Unable to load config from ' + file);
            return {};
        }
        try {
            data = JSON.parse(text);
        }
        catch(e) {
            logUtil.emitError({}, new Date() + ' error loading config file: ' + file);
            console.log(e.stack || e);
            return;
        }
    }

    return data;
}
