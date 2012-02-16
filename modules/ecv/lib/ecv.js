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

var http = require('http'),
    os = require('os');

/**
 * The ECV check sends a "/tables" request to the running server. Anything other than a valid JSON response is
 * treated as an error.
 */

var hostname = os.hostname();
var ip; // populate on first request.

exports.enable = function(app, port, path) {
    app.get(path || '/ecv', function(req, res) {
        var tosend = {
            date : new Date ,
            port : port
        };
        var options = {
            host:'localhost',
            port:port,
            path:'/tables',
            method:'GET',
            headers:{
                host:'localhost',
                connection:'close',
                accept: 'application/json'

            }
        };
        var creq = http.request(options, function(cres) {
            cres.setEncoding('utf8');
            var data = '';
            cres.on('data', function(chunk) {
                data = data + chunk;
            });

            cres.on('end', function() {
                if(cres.statusCode >= 300) {
                    // Not happy
                    unhappy(req, res, tosend);
                }
                else {
                    try {
                        JSON.parse(data);
                        happy(req, res, tosend);
                    }
                    catch(e) {
                        // Not happy
                        unhappy(req, res, tosend);
                    }
                }
            });
        });
        creq.on('error', function(err) {
            unhappy(req, res, tosend.date);
        });
        creq.end();
    });
};

function happy(req, res, tosend) {
    res.writeHead(200, {
        'content-type': 'text/plain',
        'cache-control': 'no-cache'
    });
    if(!ip) {
        // req.connection.address() cant be null.
        ip = req.connection.address()['address'];
    }
    res.write('status=AVAILABLE&ServeTraffic=true&ip='+ ip +'&hostname='+ hostname +'&port=' + tosend.port+ '&time=' + tosend.date.toString());
    res.end();
}

function unhappy(req, res, tosend) {
    res.writeHead(500, {
        'content-type': 'text/plain',
        'cache-control': 'no-cache'
    });
    // IP address got from req object in unhappy paths.
    res.write('status=WARNING&ServeTraffic=false&ip='+ req.connection.address()['address'] +'&hostname='+ hostname +'&port=' + tosend.port + '&time=' + tosend.date.toString());
    res.end();
}
