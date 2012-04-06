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
    util = require('util'),
    http = require('http'),
    fs = require('fs');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

var Listener = require('./utils/log-listener.js');

module.exports = {

    'pagination-no-patch':function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type':'application/json'

            });
            res.end(JSON.stringify({'path':req.url}));
        });
        server.listen(3026, function () {
            var script = fs.readFileSync(__dirname + '/mock/pag-no-patch.ql', 'UTF-8');

            var listener = new Listener(engine);
            // Do the test here.
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, result) {
                    listener.assert(test);
                    if (err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.equals(result.body.path, '/?start=10&count=5', 'wrong path');
                        test.done();
                    }
                    server.close();
                });
            });
        });
    },
    'paginationpatch':function (test) {
        var server = http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type':'application/json'

            });
            res.end(JSON.stringify({'path':req.url}));
        });
        server.listen(3026, function () {
            var script = fs.readFileSync(__dirname + '/mock/pagpatch.ql', 'UTF-8');
            var listener = new Listener(engine);

            // Do the test here.
            engine.execute(script, function (emitter) {
                emitter.on('end', function (err, result) {
                    listener.assert(test);
                    if (err) {
                        console.log(err.stack || util.inspect(err, false, 10));
                        test.fail('got error');
                        test.done();
                    }
                    else {
                        test.equals(result.headers['content-type'], 'application/json', 'json expected');
                        test.equals(result.body.path, '/?=&count=5&pageNumber=2', 'wrong path');
                        test.done();
                    }
                    server.close();
                });
            });
        });
    }
}