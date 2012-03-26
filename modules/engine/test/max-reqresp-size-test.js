/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
    logger = require('winston'),
    http = require('http'),
    util = require('util'),
    spawn = require('child_process').spawn;

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    connection: 'close'
});

module.exports = {
    'response-from-server': function(test) {
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock' + req.url;
            res.writeHead(200, {
                'Content-Type' : file.indexOf('.xml.gz') >= 0 ? 'application/xml' : 'application/json',
                'Transfer-Encoding' : 'chunked'
            });

            // use gzip to compress the mock data file; uncompressed file is around 10MB; compressed file is around 90KB
            var gunzip = spawn('gunzip', ['-c', file]);

            gunzip.stderr.on('data', function (err) {
                console.log('gunzip process error '+ err); // just in case
            });

            util.pump(gunzip.stdout, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });

            req.on('close', function(e) {
                // server is going to drop the connection by doing socket.destroy(),
                // so we need to terminate the spawned process, otherwise the test will hang
                gunzip.kill();
            });

        });
        server.listen(3000, function() {
            var q = 'create table response.from.server.table on select get from "http://localhost:3000/max-server-response.xml.gz"' +
                ' using patch "test/tables/ebay.finding.items.js" ' +
                ' resultset "findItemsByKeywordsResponse.searchResult.item"; ' +
                'select * from response.from.server.table';
            engine.exec(q, function(err, list) {
                if (!err) {
                    test.fail('did not get expected error');
                    test.done();
                } else {
                    test.equals(err.status, 502, '502 status code expected');
                    test.equals(err.message, 'Response length exceeds limit', 'Error explanation expected');
                    test.done();
                }
                server.close();
            });
        });
    }
}