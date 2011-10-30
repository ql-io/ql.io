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

var sys = require('sys'),
    MutableURI = require('lib/ql.uri'),
    _ = require('underscore');

module.exports = {
    'remove': function(test) {
        var u = 'http://www.subbu.org?p1=v1&p2=v2&p3=v3';
        var parsed = new MutableURI(u);
        parsed.removeParam('p3');
        test.equal(parsed.format(), 'http://www.subbu.org/?p1=v1&p2=v2')
        test.done();
    },

    'remove-empty': function(test) {
        var u = 'http://www.subbu.org?p1=v1&p2&p3=v3&p4';
        var parsed = new MutableURI(u);
        parsed.removeEmptyParams();
        test.equal(parsed.format(), 'http://www.subbu.org/?p1=v1&p3=v3')
        test.done();
    },

    'set-param': function(test) {
        var u = 'http://www.subbu.org?p1=v1&p2&p3=v3&p4';
        var parsed = new MutableURI(u);
        parsed.setParam('p4', 'v4');
        test.equal(parsed.format(), 'http://www.subbu.org/?p1=v1&p2=&p3=v3&p4=v4')
        test.done();
    },

    'add-param': function(test) {
        var u = 'http://www.subbu.org?p1=v1&p2&p3=v3';
        var parsed = new MutableURI(u);
        parsed.addParam('p4', 'v41');
        test.equal(parsed.format(), 'http://www.subbu.org/?p1=v1&p2=&p3=v3&p4=v41')
        test.done();
    }


}