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

var Engine = require('../lib/engine');

var engine = new Engine();

module.exports = {
    'select-star-from-obj': function(test) {
        var context, q;
        context = {
            foo : {
                'hello' : 'Hello',
                'world' : 'World'
            }
        };
        q = 'select * from foo';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, context.foo);
                test.done();
            }
        }});
    },

    'select-some-from-obj': function(test) {
        var context, q;
        context = {
            foo : {
                'fname' : 'Hello',
                'lname' : 'World',
                'place' : 'Sammamish, WA'
            }
        };
        q = 'select fname, lname, place from foo';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equals(result.body.length, 1);
                test.equals(result.body[0][0], 'Hello');
                test.equals(result.body[0][1], 'World');
                test.equals(result.body[0][2], 'Sammamish, WA');
                test.done();
            }
        }});
    },

    'select-deeper' : function(test) {
        var context, q;
        context = {
            foo : {
                'name' : {
                    'first' : 'Hello',
                    'last' : 'World'
                },
                'addresses' : [
                    {
                        'street' : '1 Main Street',
                        'city' : 'No Name'
                    },
                    {
                        'street' : '2 Main Street',
                        'city' : 'Some Name'
                    }]
            }
        };
        q = 'select addresses[0].street, addresses[1].city, name.last from foo';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equals(result.body.length, 1);
                test.equals(result.body[0][0], '1 Main Street');
                test.equals(result.body[0][1], 'Some Name');
                test.equals(result.body[0][2], 'World');
                test.done();
            }
        }});
    }
};