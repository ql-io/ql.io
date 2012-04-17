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
    fs = require('fs');

module.exports = {
    'error event for error code': function(test) {

        var errorGot = false;

        var errorHandler = function(ctx, msg) {
            ctx = ctx || {};
            test.equals(ctx.type, 'ql.io', 'ql.io expected');
            test.equals(JSON.stringify(msg), '{"headers":{"content-type":"application/json"},"body":{}}');
            errorGot = true;
        }

        var server = http.createServer(function(req, res) {
            res.writeHead(502, {
                'Content-Type' : 'application/json',
                'Content-Length' : 0
            });
            res.write(" \r\n\t \r\n\t  \r\n\t")
            res.end();
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
            });
            engine.once(Engine.Events.ERROR, errorHandler);

            var script = fs.readFileSync(__dirname + '/mock/empty-json-resp.ql', 'UTF-8');

            engine.exec(script, function(err, result) {

                if (err) {
                    test.equals(err.headers['content-type'], 'application/json', 'json expected');
                    test.equals(JSON.stringify(err.body), '{}', 'empty expected');
                    test.ok(errorGot, "Expected error");
                    test.done();
                }
                else {
                    test.fail('failure expected got success');
                    test.done();
                }
                server.close();
            });
        });
    },
    'error event for network error': function(test) {

        var errorGot = false;

        var errorHandler = function(ctx, msg) {
            ctx = ctx || {};
            test.equals(ctx.type, 'ql.io', 'ql.io expected');
            test.ok(msg.message.indexOf('ECONNREFUSED') != -1, 'Expected ECONNREFUSED in error');
            errorGot = true;
        }

        // Do the test here.
        var engine = new Engine({
        });
        engine.once(Engine.Events.ERROR, errorHandler);
        var script = fs.readFileSync(__dirname + '/mock/empty-json-resp.ql', 'UTF-8');

        engine.exec(script, function(err, result) {
            if (err) {
                test.ok(errorGot, "Expected error event");
                test.done();
            }
            else {
                test.fail('failure expected got success');
                test.done();
            }
        });
    },

    'error event for random exception': function(test) {

        var errorGot = false;

        var errorHandler = function(ctx, msg) {
            ctx = ctx || {};
            test.equals(ctx.type, 'table', 'table expected');
            test.equals(msg.type, 'undefined_method');
            errorGot = true;
        }

        // Do the test here.
        var engine = new Engine({
        });
        engine.once(Engine.Events.ERROR, errorHandler);
        var script = fs.readFileSync(__dirname + '/mock/forIncMkyPatchErr.ql', 'UTF-8');

        engine.exec(script, function(err, result) {

            if (err) {
                test.ok(errorGot, "Expected error event");
                test.done();
            }
            else {
                test.fail('failure expected got success');
                test.done();
            }
        });
    }

}