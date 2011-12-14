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

var _ = require('underscore'), Engine = require('../lib/engine'), EventEmitter = require('events').EventEmitter, sys = require('sys'), http = require('http'), fs = require('fs'), util = require('util');

module.exports = {
    'select from csv service' : function(test) {
        // Start a file server
        var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'text/csv',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if (e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            // Do the test here.
            var engine = new Engine({
                connection : 'close'
            });
            var script = fs.readFileSync(__dirname + '/mock/csvSelect.ql', 'UTF-8');
            engine.exec(script, function(err, results) {
                if (err) {
                    console.log(err.stack || err);
                    test.ok(false, 'Grrr');
                    test.done();
                }
                else {
                    results = results.body;
                    test.deepEqual(results, [
                        { id: '1', lastname: 'Dow', firstname: 'John' },
                        { id: '101',
                            lastname: 'AnotherDow',
                            firstname: 'Jane' }
                    ]);
                    test.done();
                }
                server.close();

            });
        });
    }
}