/**
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

var Engine = require('../lib/engine'),
    http = require('http'),
    fs = require('fs'),
    util = require('util'),
    URL = require('url'),
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level:'error'});

module.exports = {

    'with-proxy':function (test) {

        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type':file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length':stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function (e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });

        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
                config:__dirname + '/config/proxy.json',
                connection:'close'
            });

            var script = fs.readFileSync(__dirname + '/mock/proxy.ql', 'UTF-8');
            script = script.replace("127.0.0.1", "localhost");

            var proxy_server = http.createServer(
                function (req, res) {
                    var url = URL.parse(req.url, false);
                    var options = {
                        host:url.hostname,
                        port:3000,
                        path:url.pathname,
                        method:req.method,
                        headers:req.headers
                    };

                    var proxy_request = http.request(options, function (proxy_response) {
                        proxy_response.on('data', function (chunk) {
                            res.write(chunk, 'binary');
                        });
                        proxy_response.on('end', function () {
                            res.end();
                        });
                    });
                    req.addListener('data', function (chunk) {
                        proxy_request.write(chunk, 'binary');
                    });
                    req.addListener('end', function () {
                        proxy_request.end();
                    });
                });
            proxy_server.listen(3003);

            engine.exec({
                script:script,
                cb:function (err, result) {
                    try {
                        if (err) {
                            console.log(err.stack || err);
                            test.ok(false);
                        }
                        else {
                            test.ok(result && result.body.id === "1");
                        }
                        test.done();
                    }
                    finally {
                        server.close();
                        proxy_server.close();
                    }
                }
            });
        });
    },

    'with-proxy-star':function (test) {

        var server = http.createServer(function (req, res) {
            var file = __dirname + '/mock' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type':file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length':stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function (e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });

        server.listen(3000, "127.0.0.1", function () {
            // Do the test here.
            var engine = new Engine({
                config:__dirname + '/config/proxy.json',
                connection:'close'
            });

            var script = fs.readFileSync(__dirname + '/mock/proxy.ql', 'UTF-8');
            var proxy_server = http.createServer(
                function (req, res) {
                    var url = URL.parse(req.url, false);
                    var options = {
                        host:url.hostname,
                        port:3000,
                        path:url.pathname,
                        method:req.method,
                        headers:req.headers
                    };

                    var proxy_request = http.request(options, function (proxy_response) {
                        proxy_response.on('data', function (chunk) {
                            res.write(chunk, 'binary');
                        });
                        proxy_response.on('end', function () {
                            res.end();
                        });
                    });
                    req.addListener('data', function (chunk) {
                        proxy_request.write(chunk, 'binary');
                    });
                    req.addListener('end', function () {
                        proxy_request.end();
                    });
                });
            proxy_server.listen(3004);

            engine.exec({
                script:script,
                cb:function (err, result) {
                    try {
                        if (err) {
                            console.log(err.stack || err);
                            test.ok(false);
                        }
                        else {
                            test.ok(result && result.body.id === "1");
                        }
                        test.done();
                    }
                    finally {
                        server.close();
                        proxy_server.close();
                    }
                }
            });
        });
    },

    'dont-use-proxy':function (test) {

        var engine = new Engine({
            tables:__dirname + '/tables',
            config:__dirname + '/config/proxy.json',
            connection:'close'
        });

        var script = "select * from google.geocode where address = 'Mount Everest'";
        engine.exec({
            script:script,
            cb:function (err, result) {
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false);
                }
                else {
                    test.ok(result && result.body[0].geometry);
                }
                test.done();
            }
        });
    }
};
