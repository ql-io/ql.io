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

var csvXFormer = require('../lib/xformers/csv');

exports['Simple parse with headers'] = function (test) {
    csvXFormer.toJson('id,lastname,firstname\r\n1,Dow,John\r\n101,AnotherDow,Jane', function(results) {
        test.deepEqual(results, [
            { id: '1', lastname: 'Dow', firstname: 'John' },
            { id: '101',
                lastname: 'AnotherDow',
                firstname: 'Jane' }
        ]);
        test.done();
    }, function(error) {
        test.fail("Error not expected");
        test.done();
    }, true);
};

exports['Handle null with headers'] = function (test) {
    csvXFormer.toJson(null, function(json) {
        test.deepEqual(json, []);
        test.done();
    }, function(error) {
        test.fail("Error  expected", json);
        test.done();
    }, true);
};

exports['Handle undefined with headers'] = function (test) {
    csvXFormer.toJson(undefined, function(json) {
        test.deepEqual(json, []);
        test.done();
    }, function(error) {
        test.fail("Error  expected", json);
        test.done();
    }, true);
};


exports['Handle akjkjdf with headers'] = function (test) {
    csvXFormer.toJson("akjkjdf", function(json) {
        test.deepEqual(json, []);
        test.done();
    }, function(error) {
        test.fail("Error  expected", json);
        test.done();
    }, true);
};

exports['Simple parse without headers'] = function (test) {
    csvXFormer.toJson('id,lastname,firstname\r\n1,Dow,John\r\n101,AnotherDow,Jane', function(results) {
        test.deepEqual(results, [
            [ 'id', 'lastname', 'firstname' ],
            [ '1', 'Dow', 'John' ],
            [ '101', 'AnotherDow', 'Jane' ]
        ]);
        test.done();
    }, function(error) {
        test.fail("Error not expected");
        test.done();
    });
};

exports['Handle null without headers'] = function (test) {
    csvXFormer.toJson(null, function(json) {
        test.deepEqual(json, [ [ 'null' ] ]);
        test.done();
    }, function(error) {
        test.fail("Error  expected", json);
        test.done();
    });
};

exports['Handle undefined without headers'] = function (test) {
    csvXFormer.toJson(undefined, function(json) {
        test.deepEqual(json, [ [ 'undefined' ] ]);
        test.done();
    }, function(error) {
        test.fail("Error  expected", json);
        test.done();
    });
};


exports['Handle akjkjdf without headers'] = function (test) {
    csvXFormer.toJson("akjkjdf", function(json) {
        test.deepEqual(json, [ [ 'akjkjdf' ] ]);
        test.done();
    }, function(error) {
        test.fail("Error  expected", json);
        test.done();
    });
};






