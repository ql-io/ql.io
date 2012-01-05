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

'use strict'

var uriTemplate = require(__dirname + '/../lib/uri-template'),
    sys = require('sys'),
    _ = require('underscore');

module.exports = {
    'notoken': function(test) {
        var u = "http://www.subbu.org";
        var p = uriTemplate.parse(u);
        var e = ['http://www.subbu.org'];
        test.deepEqual(p.stream, e);
        test.done();
    },

    'basic': function(test) {
        var u = "http://www.subbu.org?p1={p1}&p2={p2}";
        var p = uriTemplate.parse(u);
        var e = [
            'http://www.subbu.org?p1=',
            {
                variable: 'p1'
            },
            '&p2=',
            {
                variable: 'p2'
            }];
        test.deepEqual(p.stream, e);
        test.done();
    },

    'required': function(test) {
        var u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        var p = uriTemplate.parse(u);
        var e = [
            'http://www.subbu.org?p1=',
            {
                variable: 'p1'
            },
            '&p2=',
            {
                variable: 'p2',
                required: true
            },
            '&p3=',
            {
                variable: 'p3'
            }];
        test.deepEqual(p.stream, e);
        test.done();
    },

    'format': function(test) {
        var u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        var p = uriTemplate.parse(u);
        var s = p.format({
            p1: 'v1',
            p2: 'v2',
            p3: 'v3'
        });
        test.equal(s, 'http://www.subbu.org?p1=v1&p2=v2&p3=v3');
        test.done();
    },

    'format-defaults': function(test) {
        var u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        var p = uriTemplate.parse(u);
        var s = p.format({}, {
            p1: 'd1',
            p2: 'd2',
            p3: 'd3'
        });
        test.equal(s, 'http://www.subbu.org?p1=d1&p2=d2&p3=d3');
        test.done();
    },

    'format-override': function(test) {
        var u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        var p = uriTemplate.parse(u);
        var s = p.format({
            p1: 'v1',
            p3: 'v3'
        }, {
            p1: 'd1',
            p2: 'd2',
            p3: 'd3'
        });
        test.equal(s, 'http://www.subbu.org?p1=v1&p2=d2&p3=v3');
        test.done();
    },

    'format-missing': function(test) {
        var u = 'http://www.subbu.org?p1={p1}&p2={^p2}&p3={p3}';
        var p = uriTemplate.parse(u);
        try {
            var s = p.format({
                p1: 'v1',
                p3: 'v3'
            }, {
                p1: 'd1',
                p3: 'd3'
            });
            test.fail('Missing param - error not caught');
        }
        catch(e) {
            // expected
        }
        test.done();
    },

    'multivalued-split': function(test) {
        var str = 'http://www.subbu.org?p1={p1}&p2={p2}';
        var template = uriTemplate.parse(str);
        var uri = template.format({
            p1: 'v1',
            p2: ['v2-1', 'v2-2']
        });
        test.ok(_.isArray(uri), 'Expected an array');
        test.equals(uri.length, 2, 'Expected two URIs');
        test.equals(uri[0], 'http://www.subbu.org?p1=v1&p2=v2-1');
        test.equals(uri[1], 'http://www.subbu.org?p1=v1&p2=v2-2');
        test.done();
    },

    'multivalued-encode': function(test) {
        var str = 'http://www.subbu.org?p1={p1}&p2={|p2}';
        var template = uriTemplate.parse(str);
        var uri = template.format({
            p1: 'v1',
            p2: ['v2-1', 'v2-2']
        });
        test.equals(uri, 'http://www.subbu.org?p1=v1&p2=v2-1%2Cv2-2');
        test.done();
    },

    'multivalued-multi-multi': function(test) {
        var str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={p3}';
        var template = uriTemplate.parse(str);
        try {
            template.format({
                p1: 'v1',
                p2: ['v2-1', 'v2-2'],
                p3: ['v3-1', 'v3-2']
            });
            test.ok(false, 'Expected to fail');
            test.done();
        }
        catch(e) {
            test.ok(true, 'Expected to fail');
            test.done();
        }
    },

    'multivalued-required': function(test) {
        var str = 'http://www.subbu.org?p1={p1}&p2={^|p2}&p3={^|p3}';
        var p = uriTemplate.parse(str);
        var e = [
            'http://www.subbu.org?p1=',
            {
                variable: 'p1'
            },
            '&p2=',
            {
                variable: 'p2',
                multivalued: true,
                required: true
            },
            '&p3=',
            {
                variable: 'p3',
                multivalued: true,
                required: true
            }
        ];
        test.deepEqual(p.stream, e);
        test.done();
    },

    'multivalued-required-max': function(test) {
        var str = 'http://www.subbu.org?p1={p1}&p2={^|p2}&p3={^|p3}&p4={^20|p4}';
        var p = uriTemplate.parse(str);
        var e = [
            'http://www.subbu.org?p1=',
            {
                variable: 'p1'
            },
            '&p2=',
            {
                variable: 'p2',
                multivalued: true,
                required: true
            },
            '&p3=',
            {
                variable: 'p3',
                multivalued: true,
                required: true
            },
            '&p4=',
            {
                variable: 'p4',
                multivalued: true,
                max: 20,
                required: true
            }
        ];
        test.deepEqual(p.stream, e);
        test.done();
    },

    'multivalued-split-max': function(test) {
        var str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={2|p3}';
        var template = uriTemplate.parse(str);
        var uri = template.format({
            p1: 'v1',
            p2: 'v2',
            p3: ['v3-1', 'v3-2', 'v3-3']
        });
        test.ok(_.isArray(uri), 'Expected an array');
        test.equals(uri.length, 2, 'Expected two URIs');
        test.equals(uri[0], 'http://www.subbu.org?p1=v1&p2=v2&p3=v3-1%2Cv3-2');
        test.equals(uri[1], 'http://www.subbu.org?p1=v1&p2=v2&p3=v3-3');
        test.done();
    },

    'multivalued-split-max-more': function(test) {
        var str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={2|p3}';
        var template = uriTemplate.parse(str);
        var uri = template.format({
            p1: 'v1',
            p2: 'v2',
            p3: ['v3-1', 'v3-2', 'v3-3', 'v3-4', 'v3-5']
        });
        test.ok(_.isArray(uri), 'Expected an array');
        test.equals(uri.length, 3, 'Expected two URIs');
        test.equals(uri[0], 'http://www.subbu.org?p1=v1&p2=v2&p3=v3-1%2Cv3-2');
        test.equals(uri[1], 'http://www.subbu.org?p1=v1&p2=v2&p3=v3-3%2Cv3-4');
        test.equals(uri[2], 'http://www.subbu.org?p1=v1&p2=v2&p3=v3-5');
        test.done();
    },

    'multivalued-split-max-less': function(test) {
        var str = 'http://www.subbu.org?p1={p1}&p2={p2}&p3={5|p3}';
        var template = uriTemplate.parse(str);
        var uri = template.format({
            p1: 'v1',
            p2: 'v2',
            p3: ['v3-1', 'v3-2', 'v3-3']
        });
        test.equals(uri, 'http://www.subbu.org?p1=v1&p2=v2&p3=v3-1%2Cv3-2%2Cv3-3');
        test.done();
    },

    'encode': function(test) {
        var str = 'http://www.foo.com?p1={p1}&p2={p2}&p3={5|p3}';
        var template = uriTemplate.parse(str);
        var uri = template.format({
            p1: 'this is a value',
            p2: 'this+is+a+value',
            p3: 'this/is/another/value'
        });
        test.equals(uri, 'http://www.foo.com?p1=this%20is%20a%20value&p2=this%2Bis%2Ba%2Bvalue&p3=this%2Fis%2Fanother%2Fvalue');
        test.done();
    },

    'merge': function(test) {
        var str = 'http://www.foo.com?p1={p1}&p2={p2}&p3={#p3}';
        var template = uriTemplate.parse(str);
        test.equals(template.merge(), 'block');
        str = 'http://www.foo.com?p1={p1}&p2={p2}&p3={p3}';
        template = uriTemplate.parse(str);
        test.ok(template.merge(), 'field');
        test.done();
    },

    'format-nested': function(test) {
        var u = 'http://www.subbu.org?p1={a.p1}&p2={^a.p2}&p3={a.p3}';
        var p = uriTemplate.parse(u);
        var s = p.format({
            a : {
                p1: 'v1',
                p2: 'v2',
                p3: 'v3'
            }
        });
        test.equal(s, 'http://www.subbu.org?p1=v1&p2=v2&p3=v3');
        test.done();
    },


    'format-no-values': function(test) {
        var u = 'http://www.subbu.org?p1={a.p1}&p2={a.p2}&p3={a.p3}';
        var p = uriTemplate.parse(u);
        var s = p.format({});
        test.equal(s, 'http://www.subbu.org?p1=&p2=&p3=');
        test.done();
    },

    'nested-tokens': function(test) {
        var u = 'http://www.foo.com?p1={p1}&p2={config.{ua}.apikey}';
        var p = uriTemplate.parse(u);
        var util = require('util');

        var s = p.format({
            p1: 'v1',
            ua: 'safari',
            config: {
                safari: {
                    apikey: '1234'
                }
            }
        }, true);

        test.equal(s, 'http://www.foo.com?p1=v1&p2=1234');
        test.done();
    }
};