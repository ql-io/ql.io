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

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    http = require('http'),
    fs = require('fs'),
    url = require('url'),
    util = require('util');

module.exports = {
    'emtpy where val': function(test) {
        var server = http.createServer(function(req, res) {
            var params = url.parse(req.url, true);
            if(params.hasOwnProperty('p1')) {
                res.writeHead(200, {
                    'Content-Type' : 'application/json',
                    'Content-Length' : 0
                });
            }
            else {
                res.writeHead(400, {
                    'Content-Type' : 'application/json',
                    'Content-Length' : 0
                });
            }
            res.end();
        });
        server.listen(3000, function() {
            var engine = new Engine({
            });
            var script = fs.readFileSync(__dirname + '/mock/empty-where-val.ql', 'UTF-8');
            engine.exec(script, function(err, result) {
                if(err) {
                    test.done();
                }
                else {
                    test.fail('Did not receive an error');
                    test.done();
                }
                server.close();
            });
        });
    }
}