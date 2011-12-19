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
    logger = require('winston'),
    http = require('http'),
    fs = require('fs'),
    util = require('util');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    'connection': 'close'
});

module.exports = {
    'response-patch-test': function(test) {
       var server = http.createServer(function(req, res) {
            var file = __dirname + '/mock/' + req.url;
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        });
        server.listen(3000, function() {
            // Do the test here.
         var script = fs.readFileSync(__dirname + '/mock/response-patch.ql', 'UTF-8');

        // the normal result (without body patching) would reside in item, but the table def returns items,
        // so if the result.body is not empty, then the body patch worked.
	    engine.exec(script, function(err, result) {
           	 if (err) {
                     logger.debug("ERROR: " + JSON.stringify(err));
               	      test.ok(false);
                      test.done();
                 } else if (result) {
                     logger.debug("RESULT: " + JSON.stringify(result));
                     test.ok(result.body);
                     test.done();
                 }
	        server.close();
             });
          });
    }
}
