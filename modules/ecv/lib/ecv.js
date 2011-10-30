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

var http = require('http');

/**
 * The ECV check sends a "show tables" request to the running server. Anything other than a valid JSON response is
 * treated as an error.
 */
exports.enable = function(app, port) {
    app.get('/ecv', function(req, res) {
        var tosend = {
            date : new Date ,
            port : port
        };
        // TODO: Switch os.getNetworkInterfaces
        var options = {
            host:'localhost',
            port:port,
            path:'/q?s=show%20tables',
            method:'GET',
            headers:{
                host:'localhost',
                connection:'close'
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
                    unhappy(res, tosend);
                }
                else {
                    try {
                        JSON.parse(data);
                        happy(res, tosend);
                    }
                    catch(e) {
                        // Not happy
                        unhappy(res, tosend);
                    }
                }
            });
        });
        creq.on('error', function(err) {
            unhappy(res, date);
        });
        creq.end();
    });
}

function happy(res, tosend) {
    res.writeHead(200, {
        'content-type': 'text/plain',
        'cache-control': 'no-cache'
    })
    res.write('status=AVAILABLE&ServeTraffic=true&ip=127.0.0.1&hostname=localhost&port=' + tosend.port+ '&time=' + tosend.date.toString());
    res.end();
}

function unhappy(res, tosend) {
    res.writeHead(500, {
        'content-type': 'text/plain',
        'cache-control': 'no-cache'
    })
    res.write('status=WARNING&ServeTraffic=true&ip=127.0.0.1&hostname=localhost&port=' + tosend.port + '&time=' + tosend.date.toString());
    res.end();
}
