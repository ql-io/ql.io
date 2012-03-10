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

var _    = require('underscore'),
    util = require('util');

var Engine = require('../lib/engine');

var cooked = {
    with200json : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload: '                   '
            }
        ],
        script: 'create table items on select get from "http://localhost:3000/"'+
                'resultset "Item";'+
                'return select * from items;',


        udf: {
            test : function (test, err, result) {
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.equals(result.body.length, 0, 'empty expected');

                }
        }

    }
    },
    with200xml : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "xml",
                payload: '                   '
            }
        ],
        script: 'create table items on select get from "http://localhost:3000/"'+
                'resultset "Item";'+
                'return select * from items;',


        udf: {
            test : function (test, err, result) {
                if (err) {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'json expected');
                    test.equals(result.body.length, 0, 'empty expected');

                }
        }
       }
    },
    witherrorjson : {
        ports: [
            {
                port: 3000,
                status: 502,
                type: "application",
                subType: "json",
                payload: '                   '
            }
        ],
        script: 'create table items on select get from "http://localhost:3000/"'+
                'resultset "Item";'+
                'return select * from items;',
        udf: {
            test : function (test, err, result) {
                if (err) {
                    test.equals(err.headers['content-type'], 'application/json', 'json expected');
                    test.equals(JSON.stringify(err.body), '{}', 'empty expected');

                }
                else {
                    test.fail('failure expected got success');

                }
             }
        }
    },
    witherrorxml : {
        ports: [
            {
                port: 3000,
                status: 502,
                type: "application",
                subType: "xml",
                payload: '                   '
            }
        ],
        script: 'create table items on select get from "http://localhost:3000/"'+
                'resultset "Item";'+
                'return select * from items;',
        udf: {
            test : function (test, err, result) {
                if (err) {
                    test.equals(err.headers['content-type'], 'application/json', 'json expected');
                    test.equals(JSON.stringify(err.body), '{}', 'empty expected');

                }
                else {
                    test.fail('failure expected got success');

                }
            }
        }

    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});
