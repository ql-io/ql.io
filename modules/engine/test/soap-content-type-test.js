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
    util = require('util');

var engine = new Engine({
    config:__dirname + '/config/dev.json',
    connection:'close'
});

exports['soap-xml'] = function (test) {
    var server = http.createServer(function (req, res) {
        var file = __dirname + '/mock/' + req.url;
        var stat = fs.statSync(file);
        res.writeHead(200, {
            'Content-Type':file.indexOf('.xml') >= 0 ? 'application/soap+xml' : 'application/json',
            'Content-Length':stat.size
        });
        var readStream = fs.createReadStream(file);
        util.pump(readStream, res, function (e) {
            if (e) {
                console.log(e.stack || e);
            }
            res.end();
        });
    });
    server.listen(3000, function () {
        // Do the test here.
        var engine = new Engine({
            connection:'close'
        });
        var script = fs.readFileSync(__dirname + '/mock/soapCreate.ql', 'UTF-8');

        engine.exec(script, function (err, result) {
            if (err) {
                console.log(err.stack || util.inspect(err, false, 10));
                test.fail('got error');
                test.done();
            }
            else {
                test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(_.isArray(result.body), 'expected an array');
                test.ok(result.body.length > 0, 'expected some items');
                test.ok(!_.isArray(result.body[0]), 'expected object in the array');
                test.done();
            }
            server.close();
        });
    });
}

exports['bad content'] = function (test) {
    var server = http.createServer(function (req, res) {
        var file = __dirname + '/mock/' + req.url;
        var stat = fs.statSync(file);
        res.writeHead(200, {
            'Content-Type':file.indexOf('.xml') >= 0 ? 'application/bad-type' : 'application/json',
            'Content-Length':stat.size
        });
        var readStream = fs.createReadStream(file);
        util.pump(readStream, res, function (e) {
            if (e) {
                console.log(e.stack || e);
            }
            res.end();
        });
    });
    server.listen(3000, function () {
        // Do the test here.
        var engine = new Engine({
            connection:'close'
        });
        var script = fs.readFileSync(__dirname + '/mock/soapCreate.ql', 'UTF-8');

        engine.exec(script, function (err, result) {
            if (err) {
                test.equals(err.message,"No transformer available");
                test.equals(err.type,"application");
                test.equals(err.subType,"bad-type");
                test.done();
            }
            else {
                console.log(util.inspect(result,false,null));
                test.ok(false, 'Expected exception');
                test.done();
            }
            server.close();
        });
    });
}
