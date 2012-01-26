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

exports['soap+xml'] = function (test) {
    var server = http.createServer(function (req, res) {

        req.on('end', function() {
            var respStr = '<?xml version="1.0"?>' +
                '<soap:Envelope xmlns:soap="http://www.w3.org/2001/12/soap-envelope" ' +
                'soap:encodingStyle="http://www.w3.org/2001/12/soap-encoding">' +
                '<soap:Body xmlns:m="http://www.example.org/stock">' +
                '<m:GetStockPriceResponse>' +
                '<m:Price>34.5</m:Price>' +
                '</m:GetStockPriceResponse>' +
                '</soap:Body>' +
                '</soap:Envelope>';

            res.writeHead(200, {
                'Content-Type':'application/soap+xml',
                'Content-Length':respStr.length
            });
            res.write(respStr);
            res.end();
        });

    });
    server.listen(3000, function () {
        // Do the test here.
        var engine = new Engine({
            connection:'close'
        });
        var script = fs.readFileSync(__dirname + '/mock/plusXml.ql', 'UTF-8');

        engine.exec(script, function (err, result) {
            if (err) {
                console.log(err.stack || util.inspect(err, false, 10));
                test.fail('got error');
                test.done();
            }
            else {
                test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(result.body['soap:Envelope']['soap:Body'], 'expected soap body in json resp');
                test.done();
            }
            server.close();
        });
    });
}

exports['atom+xml'] = function (test) {
    var server = http.createServer(function (req, res) {

        req.on('end', function() {
            var respStr = '<?xml version="1.0" encoding="utf-8"?>' +
                '<feed xmlns="http://www.w3.org/2005/Atom">' +
                '<title>Example Feed</title>' +
                '<link href="http://example.org/"/>' +
                '<updated>2003-12-13T18:30:02Z</updated>' +
                '<author>' +
                '<name>John Doe</name>' +
                '</author>' +
                '<id>urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6</id>' +
                '<entry>' +
                '<title>Atom-Powered Robots Run Amok</title>' +
                '<link href="http://example.org/2003/12/13/atom03"/>' +
                '<id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>' +
                '<updated>2003-12-13T18:30:02Z</updated>' +
                '<summary>Some text.</summary>' +
                '</entry>' +
                '</feed>';

            res.writeHead(200, {
                'Content-Type':'application/atom+xml',
                'Content-Length':respStr.length
            });
            res.write(respStr);
            res.end();
        });

    });
    server.listen(3000, function () {
        // Do the test here.
        var engine = new Engine({
            connection:'close'
        });
        var script = fs.readFileSync(__dirname + '/mock/plusXml.ql', 'UTF-8');

        engine.exec(script, function (err, result) {
            if (err) {
                console.log(err.stack || util.inspect(err, false, 10));
                test.fail('got error');
                test.done();
            }
            else {
                test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                test.ok(result.body['feed'], 'expected atom feed in json resp');
                test.done();
            }
            server.close();
        });
    });
}

exports['foo+xml'] = function (test) {
    var server = http.createServer(function (req, res) {

        req.on('end', function() {
            var respStr = '<?xml version="1.0" encoding="utf-8"?>' +
                '<foo>bar</foo>';

            res.writeHead(200, {
                'Content-Type':'application/foo+xml',
                'Content-Length':respStr.length
            });
            res.write(respStr);
            res.end();
        });

    });
    server.listen(3000, function () {
        // Do the test here.
        var engine = new Engine({
            connection:'close'
        });
        var script = fs.readFileSync(__dirname + '/mock/plusXml.ql', 'UTF-8');

        engine.exec(script, function (err, result) {
            if (err) {
                console.log(err.stack || util.inspect(err, false, 10));
                test.fail('got error');
                test.done();
            }
            else {
                test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                test.equal('bar',result.body['foo'], 'expected foo.bar in json resp');
                test.done();
            }
            server.close();
        });
    });
}

exports['bad content'] = function (test) {

    var server = http.createServer(function (req, res) {
        req.on('end', function() {
            var respStr = '<?xml version="1.0"?>' +
                '<soap:Envelope xmlns:soap="http://www.w3.org/2001/12/soap-envelope" ' +
                'soap:encodingStyle="http://www.w3.org/2001/12/soap-encoding">' +
                '<soap:Body xmlns:m="http://www.example.org/stock">' +
                '<m:GetStockPriceResponse>' +
                '<m:Price>34.5</m:Price>' +
                '</m:GetStockPriceResponse>' +
                '</soap:Body>' +
                '</soap:Envelope>';

            res.writeHead(200, {
                'Content-Type': 'application/bad+type',
                'Content-Length':respStr.length
            });
            res.write(respStr);
            res.end();
        });

    });


    server.listen(3000, function () {
        // Do the test here.
        var engine = new Engine({
            connection:'close'
        });
        var script = fs.readFileSync(__dirname + '/mock/plusXml.ql', 'UTF-8');

        engine.exec(script, function (err, result) {
            if (err) {
                test.equals(err.message,"No transformer available");
                test.equals(err.type,"application");
                test.equals(err.subType,"bad+type");
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
