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

"use strict";

var _ = require('underscore'),
    url = require('url'),
    assert = require('assert');

exports.version = require('../package.json').version;

/**
 * You will receive an instance of ql.uri in "before request" methods.
 *
 * @param str
 */
module.exports = function(str) {
    assert.ok(str, 'URL is undefined');

    var parsed = url.parse(str, true);
    var that = this;

    /**
     * Add a new parameter.
     *
     * @param name name
     * @param value value
     */
    this.addParam = function(name, value) {
        assert.ok(name, "name is undefined");
        assert.ok(value, "value is undefined");

        var val = parsed.query[name];
        var arr;
        if(val) {
            if(_.isArray(val)) {
                val.push(value);
            }
            else {
                arr = [val];
                parsed.query[name] = arr;
            }
        }
        else {
            parsed.query[name] = value;
        }
    };

    /**
     * Returns an array of values or single value or null/undefined
     *
     * @param name
     */
    this.getParam = function(name) {
        assert.ok(name, "name is undefined");
        return parsed.query[name];
    }

    /**
     * Delete a parameter. If value is undefined, uses an empty string as default.
     *
     * @param name name
     * @param value value
     */
    this.removeParam = function(name, value) {
        assert.ok(name, "name is undefined");
        var index, i;
        var val = parsed.query[name];
        index = -1;
        if(_.isArray(val)) {
            for(i = 0; i < val.length; i++) {
                if(val[i] === value || '') {
                    index = i;
                    break;
                }
            }
            if(index > -1) {
                delete val[index];
                if(val.size == 1) {
                    parsed.query[name] = val[0];
                }
            }
        }
        else {
            delete parsed.query[name]
        }
    }

    this.setParam = function(name, value) {
        this.removeParam(name);
        this.addParam(name, value);
    }

    /**
     * Returns parameters.
     */
    this.params = function() {
        return parsed.query;
    }

    /**
     * Remove all empty params from the URI.
     */
    this.removeEmptyParams = function() {
        _.each(parsed.query, function(val, name) {
            if(val === '') {
                that.removeParam(name, '');
            }
        });
    }

    /**
     * Returns URI string.
     */
    this.format = function() {
        delete parsed["search"]; // Otherwise url.format won't pick up query params
        return url.format(parsed);
    }
}