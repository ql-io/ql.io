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
    dns = require('dns'),
    os = require('os'),
    _ = require('underscore');

/**
 * The ECV check sends a "show tables" request to the running server. Anything other than a valid JSON response is
 * treated as an error.
 */

var networkIp;
var hostname = os.hostname();

ip(function (ip) {
   networkIp = ip;
});

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
            unhappy(res, tosend.date);
        });
        creq.end();
    });
};

function happy(res, tosend) {
    res.writeHead(200, {
        'content-type': 'text/plain',
        'cache-control': 'no-cache'
    });
    res.write('status=AVAILABLE&ServeTraffic=true&ip='+networkIp+'&hostname='+hostname+'&port=' + tosend.port+ '&time=' + tosend.date.toString());
    res.end();
}

function unhappy(res, tosend) {
    res.writeHead(500, {
        'content-type': 'text/plain',
        'cache-control': 'no-cache'
    });
    res.write('status=WARNING&ServeTraffic=false&ip='+networkIp+'&hostname='+hostname+'&port=' + tosend.port + '&time=' + tosend.date.toString());
    res.end();
}

function ip(cb) {
    /*
     * 1. Get all the non internal ip-addresses
     * 2. Do a reverse lookup for all the ip-addresses got in Step 1
     * 3. Find current machine's full hostname
     * 4. DNS lookup hostname, got in Step 3, to get the network IP
     */
    var hostname;
    var ips = _.pluck(_.filter(_.flatten(_.values(os.networkInterfaces())), function (ip) {
        return ip.internal === false && ip.family === 'IPv4';
    }), 'address');

    _.each(ips, function (ip) {
        dns.reverse(ip, function (err, domains) {
            hostname = _.find(domains, function (domain) {
                return domain.indexOf(os.hostname()) === 0;
            });
            if(hostname) {
                dns.resolve4(hostname, function (err, addresses) {
                    err ? cb("127.0.0.1"): cb(addresses[0]);
                });
            }
        });
    });
}

