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
    MutableURI = require('ql.io-mutable-uri'),
    EventEmitter = require('events').EventEmitter,
    http = require('http'),
    fs = require('fs');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json'
});

var Listener = require('./utils/log-listener.js');

module.exports = {
    'pagination': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/pagination.xml';
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'application/xml'
            });

            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3026, function() {
        var parsed, page;
        var q = fs.readFileSync(__dirname + '/mock/pagination.ql', 'UTF-8');

        var listener = function(payload) {
            parsed = new MutableURI(payload.uri);
        }
        var emitter = new EventEmitter();
        emitter.addListener(Engine.Events.STATEMENT_REQUEST, listener);

        var listener = new Listener(engine);
        engine.exec({
            emitter: emitter,
            script: q ,
            cb: function(err, result) {
                listener.assert(test);
                if(err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Failed.');
                    test.done();
                }
                else {
                  // Check the paginationInput.pageNumber parameter.
                    page = parsed.getParam('paginationInput.pageNumber')
                    test.equals(page, 11);
                    test.done();
                    server.close();
                }
            }
        });
    });
    }
}