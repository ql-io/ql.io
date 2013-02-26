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

'use strict'

//
// Load a UDF module. Delegates to native require. Looks for
// the module under engine, process.cwd() and finally the __dirname
// for the module.
exports.require = function() {
    var args = Array.prototype.slice.call(arguments);
    var name = args[0];
    try {
        return module.require.apply(null, args);
    }
    catch(e) {
        try {
            args[0] = process.cwd() + '/' + name;
            return module.require.apply(null, args);
        }
        catch(e) {
            try {
                var splitpath = process.cwd().split('/');
                splitpath[splitpath.length-1] = name;
                args[0] = splitpath.join('/');
                return module.require.apply(null, args);

            } catch(e) {
                args[0] = __dirname + '/' + name;
                return module.require.apply(null, args);
            }
        }

    }
}
