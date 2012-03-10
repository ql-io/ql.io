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

var _ = require('underscore');

// Fill params from given args. In stead of merging params, simply wire up a __proto__ chain
exports.prepareParams = function() {
    var params = {};
    var ref, arg;
    for(var i = 0; i < arguments.length; i++) {
        arg = arguments[i];
        if(arg === undefined) {
            continue;
        }
        if(ref === undefined) {
            ref = arg;
            params.__proto__ = ref;
        }
        else {
            // Delete undefined properties as an undefined will override a defined in the __proto__
            // chain
            _.each(arg, function(v, p) {
                if(v === undefined) delete arg[p];
            });
            ref.__proto__ = arg;
            ref = arg;
        }
    }
    return params;
}


var maxRequests;
exports.getMaxRequests = function(config, logEmitter) {
    if (config && config.maxNestedRequests) {
        maxRequests = config.maxNestedRequests;
    }

    if (!maxRequests) {
        maxRequests = 50;
        logEmitter.emitWarning('config.maxNestedRequests is undefined! Defaulting to ' + maxRequests);
    }

    return maxRequests;
}
