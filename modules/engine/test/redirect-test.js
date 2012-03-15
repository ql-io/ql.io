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
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level:'error'});

var localhost = "127.0.0.1", protocol = "http";

// http/request.js will follow up to 10 redirects

var servers_positive = [
    { 'host' : localhost, 'port' : '8300' },
    { 'host' : localhost, 'port' : '8301' },
    { 'host' : localhost, 'port' : '8302' },
    { 'host' : localhost, 'port' : '8303' },
    { 'host' : localhost, 'port' : '8304' },
    { 'host' : localhost, 'port' : '8305' },
    { 'host' : localhost, 'port' : '8306' },
    { 'host' : localhost, 'port' : '8307' },
    { 'host' : localhost, 'port' : '8308' },
    { 'host' : localhost, 'port' : '8309' },
    { 'host' : localhost, 'port' : '8310' }
];

var servers_negative = [
    { 'host' : localhost, 'port' : '8300' },
    { 'host' : localhost, 'port' : '8301' },
    { 'host' : localhost, 'port' : '8302' },
    { 'host' : localhost, 'port' : '8303' },
    { 'host' : localhost, 'port' : '8304' },
    { 'host' : localhost, 'port' : '8305' },
    { 'host' : localhost, 'port' : '8306' },
    { 'host' : localhost, 'port' : '8307' },
    { 'host' : localhost, 'port' : '8308' },
    { 'host' : localhost, 'port' : '8309' },
    { 'host' : localhost, 'port' : '8310' },
    { 'host' : localhost, 'port' : '8311' },
    { 'host' : localhost, 'port' : '8312' }
];

function setupServers(servers) {

    //create redirect servers that return response codes in the 300 range (from 300 to 309), and provide Location header
    for (var i = 0; i < servers.length - 1; i++) {
        servers[i].instance = http.createServer((function(j) {
            return function (req, res) {
                var location = protocol + '://' + servers[j + 1].host + ':' + servers[j + 1].port + req.url;
                res.writeHead(300 + j, { 'Location': location });
                res.end();
            }
        })(i)).listen(servers[i].port, servers[i].host);
    }

    // create the final server, the one that's going to return data
    servers[i].instance = http.createServer(function (req, res) {
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
    }).listen(servers[i].port, servers[i].host);
}

module.exports = {
    'positive':function (test) {
        var servers = servers_positive;

        setupServers(servers);

        var engine = new Engine({
            config:__dirname + '/config/dev.json'
        });

        var script = fs.readFileSync(__dirname + '/mock/redirect.ql', 'UTF-8');

        engine.exec({
            script:script,
            cb:function (err, result) {
                try {
                    if (err) {
                        console.log(err.stack || err);
                        test.ok(false);
                    }
                    else {
                        test.ok(result && result.body.id === "42");
                    }
                    test.done();
                }
                finally {
                    for (var i = 0; i < servers.length; i++) {
                        servers[i].instance.close();
                    }
                }
            }
        });
    },
    'negative':function (test) {
        var servers = servers_negative;

        setupServers(servers);

        var engine = new Engine({
            config:__dirname + '/config/dev.json'
        });

        var script = fs.readFileSync(__dirname + '/mock/redirect.ql', 'UTF-8');

        engine.exec({
            script:script,
            cb:function (err, result) {
                try {
                    if (err) {
                        console.log(err.stack || err);
                        test.ok(false);
                    }
                    else {
                        test.ok(result && !result.body);
                    }
                    test.done();
                }
                finally {
                    for (var i = 0; i < servers.length; i++) {
                        servers[i].instance.close();
                    }
                }
            }
        });

    }
}
