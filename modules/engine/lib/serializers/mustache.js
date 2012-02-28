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

'use strict';

var mustache = require('mustache');

exports.accepts = function(type, template, content) {
    // if no template, default to mustache
    return !template || template.match(/\.mu/);
};

exports.serialize = function(type, content, statement, params, defaults) {
    var holder = {
        statement: statement,
        params: params
    };
    return mustache.to_html(content, holder);
}