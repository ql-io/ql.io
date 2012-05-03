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

"use strict"

var _           = require('underscore'),
    fs          = require('fs'),
    http        = require('http'),
    util        = require('util'),
    FormData = require('form-data'),
    formidable = require('formidable'),
    Buffer     = require('buffer').Buffer,
    Console = require('../app.js');

// Test end-to-end flow to the UploadSiteHostedPictures Service
// This is the same test as test-multipart.js, only hits the actual service instead of a mock service

var testUSHPMultipart = function(test) {

    var c = new Console({
        tables : __dirname + '/tables',
        routes: __dirname + '/routes',
        config: __dirname + '/config/dev.json',
        'enable console': false,
        connection: 'close'
    });

    var app = c.app;

    app.listen(3000, function() {
        var form = new FormData();
        form.append('body', new Buffer('<test>Test Body</test>'));

        var dir = __dirname + '/images/';
        // var files = [ 'logoEbay_x45.gif', 'ebay_closeup.jpeg', 'ql.io.jpg' ];
        // var files = [ 'logoEbay_x45.gif', 'ebay_closeup.jpeg' ];
        var files = [ 'logoEbay_x45.gif' ];
        var idx = 0;

        _.each(files, function(file) {
            form.append(file, fs.createReadStream(dir + file));
        });

        var options = {
            host: 'localhost',
            port: 3000,
            path: '/upload/site/hosted/pictures',
            method: 'POST',
            headers: _.extend({
                host: 'localhost',
                connection: 'close'
            }, form.getHeaders())
        };

        var request = http.request(options);

        form.pipe(request);

        request.on('response', function(response) {
            response.setEncoding("utf8");
            // console.log(response.statusCode);
            var data = "";
            response.on("data", function(chunk) {
                data += chunk;
            });
            console.log(data);
            test.equals(response.statusCode, 200);
            app.close();
            test.done();
        });

        request.on('error', function(error) {
            if (error) {
                console.log('error: ' + error);
            }
        });
    });
}

module.exports = {

}
