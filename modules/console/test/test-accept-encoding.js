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

'use strict'

var http = require('http'),
    _ = require('underscore'),
    zlib = require('zlib'),
    os = require('os');


var Console = require('../app.js');
var c = new Console({
    routes: __dirname + '/routes/encoding',
    'enable console': false,
});

var app = c.app;

var cpu_load =  os.cpus().length /2;

module.exports = {
    //Happy case for deflate
    'deflate' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': 'deflate'
                }
            };
            var req = http.request(options, function(res) {
                if(os.loadavg()[1] > cpu_load) {
                    test.ok(! res.headers['content-encoding'] || res.headers['content-encoding'] === 'identity');
                    app.close();
                    test.done();
                    return;
                }
                test.ok(res.headers['content-encoding'] === 'deflate');
                test.ok(res.headers['vary'] === 'accept-encoding');
                var data = [];

                var unzip = zlib.createInflate();
                unzip.on('data', function (chunk) {
                    data.push(chunk);
                });
                unzip.on('end', function () {
                    var encoding = 'UTF-8';
                    var str = '';
                    _.each(data, function(buf) {
                        str += buf.toString(encoding);
                    });
                    test.ok(str.length > 0);
                    app.close();
                    test.done();
                });
                unzip.on('error', function (err) {
                    test.ok(false, 'Decompression failed.' + err);
                    app.close();
                    test.done();
                });

                res.on('data', function(chunk) {
                    unzip.write(chunk);
                })
                res.on('end', function() {
                    unzip.end();
                });

            });
            req.end();
        });
    },
    // Happy case for gzip
    'gzip' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/all/nike',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': 'gzip'
                }
            };
            var req = http.request(options, function(res) {
                if(os.loadavg()[1] > cpu_load) {
                    test.ok(! res.headers['content-encoding'] || res.headers['content-encoding'] === 'identity');
                    app.close();
                    test.done();
                    return;
                }                test.ok(res.headers['content-encoding'] === 'gzip');
                test.ok(res.headers['vary'] === 'accept-encoding');
                var data = [];
                var unzip = zlib.createGunzip();
                unzip.on('data', function (chunk) {
                    data.push(chunk);
                });
                unzip.on('end', function () {
                    var encoding = 'UTF-8';
                    var str = '';
                    _.each(data, function(buf) {
                        str += buf.toString(encoding);
                    });
                    test.ok(str.length > 0);
                    app.close();
                    test.done();
                });
                unzip.on('error', function (err) {
                    test.ok(false, "Decompression failed. " + err);
                    app.close();
                    test.done();
                });

                res.on('data', function(chunk) {
                    unzip.write(chunk);
                })
                res.on('end', function() {
                    unzip.end();
                });

            });
            req.end();
        });
    },
    'gzip-deflate' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': 'gzip, deflate'
                }
            };
            var req = http.request(options, function(res) {
                if(os.loadavg()[1] > cpu_load) {
                    test.ok(! res.headers['content-encoding'] || res.headers['content-encoding'] === 'identity');
                    app.close();
                    test.done();
                    return;
                }
                test.ok(res.headers['content-encoding'] === 'gzip',  '\'gzip\' content encoding expected');
                app.close();
                test.done();
            });
            req.end();
        });
    },
    'gzip-deflate-with-q' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': 'gzip;q=0.9, deflate;q=1.0'
                }
            };
            var req = http.request(options, function(res) {
                if(os.loadavg()[1] > cpu_load) {
                    test.ok(! res.headers['content-encoding'] || res.headers['content-encoding'] === 'identity');
                    app.close();
                    test.done();
                    return;
                }
                test.ok(res.headers['content-encoding'] === 'deflate', '\'deflate\' content encoding expected');
                app.close();
                test.done();
            });
            req.end();
        });
    },
    // Accept - Encoding as empty
    'empty-accept-encoding' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': ''
                }
            };
            var req = http.request(options, function(res) {
                test.ok(!res.headers['content-encoding'], "Content should not be encoded");
                test.ok(!res.headers['vary'], "Vary header must not present for uncompressed responses");
                app.close();
                test.done();
            });
            req.end();
        });
    },
    'identity-accept-encoding' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': 'identity'
                }
            };
            var req = http.request(options, function(res) {
                test.ok(!res.headers['content-encoding'], "Content should not be encoded");
                test.ok(!res.headers['vary'], "Vary header must not present for uncompressed responses");
                app.close();
                test.done();
            });
            req.end();
        });
    },
    'identity-with-q' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': 'identity;q=1.0'
                }
            };
            var req = http.request(options, function(res) {
                test.ok(!res.headers['content-encoding'], "Content should not be encoded");
                test.ok(!res.headers['vary'], "Vary header must not present for uncompressed responses");
                app.close();
                test.done();
            });
            req.end();
        });
    },
    // *;q=0 means identity
    'q-accept-encoding' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': '*;q=0'
                }
            };
            var req = http.request(options, function(res) {
                test.ok(!res.headers['content-encoding'], "Content should not be encoded");
                app.close();
                test.done();
            });
            req.end();
        });
    },
    // *;q=1 - default to gzip
    'q-1-*-accept-encoding' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': '*;q=1'
                }
            };
            var req = http.request(options, function(res) {
                if(os.loadavg()[1] > cpu_load) {
                    test.ok(! res.headers['content-encoding'] || res.headers['content-encoding'] === 'identity');
                    app.close();
                    test.done();
                    return;
                }
                test.ok(res.headers['content-encoding'] === 'gzip', "gzip content expected");
                app.close();
                test.done();
            });
            req.end();
        });
    },
    // unsupported accept encoding. ql.io doesn't throw 406,
    // instead serves identity response.
    'sdch-test' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': 'sdch'
                }
            };
            var req = http.request(options, function(res) {
                test.ok(!res.headers['content-encoding'], "Content should not be encoded");
                app.close();
                test.done();
            });
            req.end();
        });
    },
    'invalid-accept-encoding-test' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': ';q=1.0'
                }
            };
            var req = http.request(options, function(res) {
                test.ok(!res.headers['content-encoding'], "Content should not be encoded");
                app.close();
                test.done();
            });
            req.on('error', function() {
                app.close();
                test.done();
            })
            req.end();
        });
    },
    // No accept-encoding header.
    'null-accept-encoding' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/encoding/all',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json'
                }
            };
            var req = http.request(options, function(res) {
                test.ok(!res.headers['content-encoding'], "Content should not be encoded");
                app.close();
                test.done();
            });
            req.end();
        });
    },
    // non existent route
    'invalid-route' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/invalid/route',
                method: 'PUT',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    'accept' : 'application/json',
                    'accept-encoding': 'deflate'
                }
            };

            var req = http.request(options, function (res) {
                if(os.loadavg()[1] > cpu_load) {
                    test.ok(! res.headers['content-encoding'] || res.headers['content-encoding'] === 'identity');
                    app.close();
                    test.done();
                    return;
                }
                test.ok(res.headers['content-encoding'] === 'deflate');
                test.ok(res.headers['vary'] === 'accept-encoding');
                var data = [];

                var unzip = zlib.createInflate();
                unzip.on('data', function (chunk) {
                    data.push(chunk);
                });
                unzip.on('end', function () {
                    var encoding = 'UTF-8';
                    var str = '';
                    _.each(data, function(buf) {
                        str += buf.toString(encoding);
                    });
                    test.ok(str.length > 0);
                    app.close();
                    test.done();
                });
                unzip.on('error', function (err) {
                    test.ok(false, 'Decompression failed.' + err);
                    app.close();
                    test.done();
                });

                res.on('data', function(chunk) {
                    unzip.write(chunk);
                })
                res.on('end', function() {
                    unzip.end();
                });

            });
            req.end();
        });
    },
    // route
    'api-json' : function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/api',
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close',
                    accept: 'application/json',
                    'accept-encoding': 'gzip'
                }
            };
            var req = http.request(options, function(res) {
                if(os.loadavg()[1] > cpu_load) {
                    test.ok(! res.headers['content-encoding'] || res.headers['content-encoding'] === 'identity');
                    app.close();
                    test.done();
                    return;
                }
                test.ok(res.headers['content-encoding'] === 'gzip', "deflate encoding expected");
                test.ok(res.headers['vary'] === 'accept-encoding');
                var data = [];
                var unzip = zlib.createGunzip();
                unzip.on('data', function (chunk) {
                    data.push(chunk);
                });
                unzip.on('end', function () {
                    var encoding = 'UTF-8';
                    var str = '';
                    _.each(data, function(buf) {
                        str += buf.toString(encoding);
                    });
                    test.ok(str.length > 0);
                    app.close();
                    test.done();
                });
                unzip.on('error', function (err) {
                    test.ok(false, "Decompression failed. " + err);
                    app.close();
                    test.done();
                });

                res.on('data', function(chunk) {
                    unzip.write(chunk);
                })
                res.on('end', function() {
                    unzip.end();
                });

            });
            req.end();
        });
    }
}