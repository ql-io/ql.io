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
    mime        = require('mime'),
    util        = require('util'),
    multiparter = require('multiparter');

var Console = require('../app.js');
var c = new Console({
    tables: __dirname + '/insert',
    routes: __dirname + '/routes',
    config: __dirname + '/config/dev.json',
    'enable console': false,
    connection: 'close'
});

var app = c.app;

module.exports = {
    'upload files': function(test) {
        app.listen(3000, function() {
            var statement = 'insert into insert.into (name) values ("hello") with part "{req.parts[0]}";';
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/q?q=test&s=' + encodeURIComponent(statement),
                method: 'POST',
                headers: {
                    host: 'localhost',
                    connection: 'close'
                }
            };

            var request = new multiparter.request(http, options);

            var dir = __dirname + '/images/';
            var files = [ 'logoEbay_x45.gif', 'ebay_closeup.jpeg', 'ql.io.jpg' ];

            var idx = 0;

            _.forEach(files, function(file) {
                request.addStream(
                    'file-' + idx++,
                    file,
                    mime.lookup(file),
                    fs.statSync(dir + file).size,
                    fs.createReadStream(dir + file)
                );
            });

            request.send(function(error, response) {
                if (error) {
                    console.log(error);
                }

                var data = "";

                response.setEncoding("utf8");

                response.on("data", function(chunk) {
                    data += chunk;
                });

                response.on("end", function() {
                    console.log("Response from server: " + data);
                    response.setEncoding('utf8');
                    test.equals(response.statusCode, 200);

                    app.close();
                    test.done();
                });

                response.on("error", function(error) {
                    console.log(error);
                });
            });
        });
    }
}
