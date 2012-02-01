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

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    fs = require('fs'),
    http = require('http');

module.exports = {
    'partial failure': function (test) {
        var server = http.createServer(function (req, res) {
            if(req.url === '/ok') {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });
                res.end('{"state":"ok"}');
            }
            else if(req.url === '/fail') {
                res.writeHead(500, {
                    'Content-Type': 'application/json'
                });
                res.end('{"state":"fail"}');
            }
        });
        server.listen(3000, function () {
            // Do the test here.
            var engine = new Engine({
            });
            var q = fs.readFileSync(__dirname + '/mock/scatter-partial-failure.ql', 'UTF-8');
            engine.exec(q, function (err, list) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                }
                else {
                    test.ok(true);
                }
                test.done();
                server.close();
            });
        });
    }
};
