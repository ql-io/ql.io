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
    Engine = require('ql.io-engine');

var Console = require('../app.js');

var c = new Console({
    tables : __dirname + '/tables',
    routes: __dirname + '/routes',
    config: __dirname + '/config/dev.json',
    'enable console': false,
    connection: 'close'
});

var app = c.app;

module.exports = {
    'upload files': function(test) {
        var upload_server = http.createServer(function(req, res) {
            if (req.url == '/upload') {
                var parts = [], idx = 0;
                var form = new formidable.IncomingForm();
                form.onPart = function(part) {
                    if (form.headers['content-length']) {
                        var buf = new Buffer(parseInt(form.headers['content-length'], 10));
                    } else {
                        var buf = new Buffer(10485760); // 10MB
                    }

                    if (part.filename) {
                        part.on('data', function(b) {
                            idx = idx + b.copy(buf, idx);
                        });
                        part.on('end', function() {
                            buf = buf.slice(0, idx);
                            parts.push({ 'name' : part.filename, 'size' : idx, 'data' : buf });
                            idx = 0;
                        });
                        part.on('error', function(err) {
                            // TODO: handle this
                        });
                    }
                }

                form.parse(req, function(err, fields, files) {
                    if (err) {
                        util.debug(err);
                    }
                    req.body = {};
                    req.parts = parts;
                    util.debug("Server on :4000\n" + util.inspect({fields: fields, parts: parts})); // TODO: remove later
                });

                form.parse(req, function(err, fields, files) {
                    res.writeHead(200, {'content-type': 'application/json'});
                    var MultipartTestResponse = { 'parts' : parts };
                    res.end(JSON.stringify(MultipartTestResponse));
                });
                return;
            }
        }).listen(4000);

        app.listen(3000, function() {
            var form = new FormData();
            form.append('body', new Buffer('<test>Test Body</test>'));

            var dir = __dirname + '/images/';
            // var files = [ 'logoEbay_x45.gif', 'ebay_closeup.jpeg', 'ql.io.jpg' ];
            var files = [ 'logoEbay_x45.gif', 'ebay_closeup.jpeg' ];
            var idx = 0;

            _.forEach(files, function(file) {
                form.append('file-' + idx++, fs.createReadStream(dir + file));
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
                response.setEncoding("utf8");
                console.log(response.statusCode);
                var data = "";
                response.on("data", function(chunk) {
                    data += chunk;
                });

                test.equals(response.statusCode, 200);
                app.close();
                upload_server.close();
                test.done();
            });

            request.on('error', function(error) {
                if (error) {
                    console.log(error);
                }
            });
        });
    }
}
