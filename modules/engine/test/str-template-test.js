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

var strTemplate = require('../lib/engine/peg/str-template'),
    sys = require('sys'),
    _ = require('underscore');

module.exports = {
    'notoken': function(test) {
        try {
            var u = "Hello World";
            var p = strTemplate.parse(u);
            var e = ['Hello World'];
            test.deepEqual(p.stream, e);
            test.done();

        }
        catch(e) {
            console.log(e.stack || e);
        }
    },

    'basic': function(test) {
        var u = "Hello {token} World";
        var p = strTemplate.parse(u);
        var e = [
            'Hello ',
            {
                variable: 'token',
                str: 'token'
            },
            ' World'];
        test.deepEqual(p.stream, e);
        test.done();
    },

    'replace': function(test) {
        var u = "Hello {token} World";
        var p = strTemplate.parse(u);
        var s = p.format({
            token: '1234'
        })
        test.equal(s, 'Hello 1234 World');
        test.done();
    },

    'replace-keep': function(test) {
        var u = "Hello {token} World";
        var p = strTemplate.parse(u);
        var s = p.format({
            some: '1234'
        }, true)
        test.equal(s, u);
        test.done();
    },

    'replace-mixed': function(test) {
        var u = "Hello {token} World {p1} another token";
        var p = strTemplate.parse(u);
        var e = [
            'Hello ',
            {
                variable: 'token',
                str: 'token'
            },
            ' World ',
            {
                variable : 'p1',
                str : 'p1'
            },
            ' another token'];
        test.deepEqual(p.stream, e);
        var s = p.format({
            token: '1234'
        }, true)
        test.equal(s, 'Hello 1234 World {p1} another token');
        test.done();
    },

    'nested-tokens': function(test) {
        var u = '{config.{ua}.apikey}';
        var p = strTemplate.parse(u);
        var s = p.format({
            "p1": "v1",
            "ua": "safari",
            "config": {
                "safari": {
                    "apikey": "1234"
                }
            }
        }, true);
        test.equal(s, '1234');
        test.done();
    },

    'nested-tokens-keep': function(test) {
        var u = '{config.{ua}.apikey}';
        var p = strTemplate.parse(u);
        var s = p.format({
            "p1": "v1",
            "config": {
                "safari": {
                    "apikey": "1234"
                }
            }
        }, true);
        test.equal(s, '{config.{ua}.apikey}');
        test.done();
    },

    'nested-tokens-deep': function(test) {
        var u = '{aa{b{cc}b}dd}';
        var p = strTemplate.parse(u);
        var s = p.format({
            cc: 'cc'
        });
        test.equals(s, '');
        test.done();
    },

    'nested-tokens-deep-keep': function(test) {
        var u = '{aa{b{cc}b}dd}';
        var p = strTemplate.parse(u);
        var s = p.format({
            cc: 'cc'
        }, true);
        test.equals(s, '{aa{b{cc}b}dd}');
        test.done();
    }

};