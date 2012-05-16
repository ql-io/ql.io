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

module.exports = {
    'upload files': function(test) {
        var upload_server = http.createServer(function(req, res) {
            if (req.url == '/upload') {
                var form = new formidable.IncomingForm(), parts = [];

                form.onPart = function(part) {
                    var chunks = [], idx = 0, size = 0;

                    part.on('data', function(c) {
                        chunks[idx++] = c;
                        size += c.length;
                    });

                    part.on('end', function() {
                        var buf = new Buffer(size), i = 0, idx = 0;
                        while (i < chunks.length) {
                            idx = idx + chunks[i++].copy(buf, idx);
                        }
                        var p = { 'name' : part.name, 'size' : size, 'data' : buf };
                        parts.push(p);
                    });

                    part.on('error', function(err) {
                        console.log('error: ' + util.inspect(err));
                    });
                }

                form.parse(req, function(err) {
                    if (err) {
                        util.debug(err);
                    }
                    req.body = {};
                    req.parts = parts;
                });

                form.parse(req, function(err, fields, files) {
                    res.writeHead(200, {'content-type': 'application/json; charset=UTF-8'});
                    var desc = _.pluck(parts, 'name');
                    var resp = { 'MultipartTestResponse' : { 'parts' : desc }};
                    res.end(JSON.stringify(resp));
                });
                return;
            }
        }).listen(4000);

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
            var files = [ 'logoEbay_x45.gif', 'ebay_closeup.jpeg' ];
            var idx = 0;

            _.each(files, function(file) {
                form.append(file, fs.createReadStream(dir + file));
            });

            var options = {
                host: 'localhost',
                port: 3000,
                path: '/multipart/test/upload?desc=something',
                method: 'POST',
                headers: _.extend({
                    host: 'localhost',
                    connection: 'close'
                }, form.getHeaders())
            };

            var request = http.request(options);

            form.pipe(request);

            request.on('response', function(response) {
                response.setEncoding('utf8');
                var data = "";
                response.on('data', function(chunk) {
                    data += chunk;
                });

                response.on('end', function() {
                    var r = JSON.parse(data);
                    test.equals(r.parts[0], 'body');
                    test.equals(r.parts[1], 'logoEbay_x45.gif');
                    test.equals(r.parts[2], 'ebay_closeup.jpeg');
                    test.equals(response.statusCode, 200);
                    app.close();
                    upload_server.close();
                    test.done();
                });
            });

            request.on('error', function(error) {
                if (error) {
                    console.log('error: ' + error);
                }
            });
        });
    }
}
