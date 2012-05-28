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

var Engine = require('../lib/engine'),
    _ = require('underscore'),
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

module.exports = {
    'select-assign-from-obj' : function(test) {
        var context, q;
        context = {
            foo : {
                "name" : {
                    "first" : "Hello",
                    "last" : "World"
                },
                "addresses" : [
                    {
                        "street" : "1 Main Street",
                        "city" : "No Name"
                    },
                    {
                        "street" : "2 Main Street",
                        "city" : "Some Name"
                    }
                ]
            }
        };
        q = 'blah = select addresses[0].street, addresses[1].city, name.last from foo; return {"result" : "{blah}"};';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack || e);
                test.done();
            }
            else {
                test.ok(result.body.result, 'Result not found');
                test.equals(result.body.result[0][0], '1 Main Street');
                test.equals(result.body.result[0][1], 'Some Name');
                test.equals(result.body.result[0][2], 'World');
                test.done();
            }
        }});
    },

    'select-assign-from-remote': function(test) {
        var q, context = {};
        q = 'ipads = select * from ebay.finding.items where keywords = "ipad"; return {"result" : "{ipads}"};';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                // Check result body
                test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(result.body.result.length > 0, 'expected some items');

                // Check context
                test.ok(_.isArray(context.ipads), 'expected an array');
                test.ok(context.ipads.length > 0, 'expected some items');
                test.ok(!_.isArray(context.ipads[0]), 'expected object in the array');
                test.done();
            }
        }});
    },

    'script-define' : function(test) {
        var q;
        q = 'data = {\
                "name" : {\
                    "first" : "Hello",\
                    "last" : "World"\
                },\
                "addresses" : [\
                    {\
                        "street" : "1 Main Street",\
                        "city" : "No Name"\
                    },\
                    {\
                        "street" : "2 Main Street",\
                        "city" : "Some Name"\
                    }]\
            };\
fields = select addresses[0].street, addresses[1].city, name.last from data;\
return {"result" : "{fields}"};\
'
        engine.exec(q, function(err, result) {
            if(err) {
                test.fail('got error: ' + err);
                test.done();
            }
            else {
                test.ok(result.body.result, 'Result not found');
                test.equals(result.body.result[0][0], '1 Main Street');
                test.equals(result.body.result[0][1], 'Some Name');
                test.equals(result.body.result[0][2], 'World');
                test.done();
            }
        });
    },

    'script-missing-define' : function(test) {
        var q;
        q = 'return select addresses[0].street, addresses[1].city, name.last from data;'
        engine.exec(q, function(err, result) {
            if(err) {
                test.ok(true, 'Failed as expected');
                test.done();
            }
            else {
                test.fail('did not get error');
                test.done();
            }
        });
    }
};