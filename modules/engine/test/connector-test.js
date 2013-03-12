/*
 * Copyright 2013 eBay Software Foundation
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


var util = require('util'),
    _    = require('underscore'),
    mongo = require('mongodb');

var Engine = require('../lib/engine');

var cooked = {
    createtable: {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload: JSON.stringify({'message' : 'ok'})
            }
        ],
        script: 'create table items via mongodb on select do find at "ql-2:27017:test" expect foo, bar '+
            'foo1 = {"a":1}; cb = require("udfs/mongo")'+
            'return select * from items where foo = foo1 and bar = "{cb.find}";',
        /*script: 'a=1;select * from a',
        */
        udf: {
            test : function (test, err, result) {
                if(err)
                {
                    console.log(err.stack || util.inspect(err, false, 10));
                    test.fail('got error');

                }
                else
                {
                    test.equals(result.headers['content-type'], 'application/json');
                    test.equals(result.body.length, 10);

                    //test.done();
                }
            }
        }
    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});        /*
module.exports['trycatch'] = function(test) {
var client = new mongo.Db('test', new mongo.Server("ql-2", 27017, {}), {w: 1}),
    test = function (err, collection) {

            collection.count(function(err, count) {
                console.log(count);
            });

            // Locate all the entries using find
            collection.find().toArray(function(err, results) {
                console.log(results);

                // Let's close the db
                client.close();
            });

    };

client.open(function(err, p_client) {
    client.collection('test_insert', test);
});
} */
/*var client = new mongo.Db('test', new mongo.Server("ql-2", 27017, {}), {w: 1}),
    test = function (err, collection) {

            // Locate all the entries using find
            collection.find().toArray(function(err, results) {
                test.equals(1, results.length);
                test.equals(results[0].a ,2);

                // Let's close the db
                client.close();
            });

    };

client.open(function(err, p_client) {
    client.collection('test_insert', test);
});
     */
