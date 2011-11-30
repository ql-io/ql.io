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
    sys = require('sys'),
    fs = require('fs'),
    http = require('http'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter(),
    logger = require('winston');
    logger.remove(logger.transports.Console);
    logger.add(logger.transports.Console, {level: 'error'});
    
   var engine = new Engine({
      tables : __dirname + '/tables',
      config: __dirname + '/config/dev.json',
      'connection': 'close'
    });

   module.exports = {
    'select-times': function(test) {
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
            var engine = new Engine({
                connection : 'close'
            });
	    var q = fs.readFileSync(__dirname + '/mock/scatter.ql', 'UTF-8');
       	    engine.exec(q, function(err, list) {
               if(err) {
                  console.log(err.stack || err);
                  test.fail('got error: ' + err.stack || err);
               }
               else {
                  test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                  test.ok(_.isArray(list.body), 'expected an array');
                  test.equals(list.body.length, 6, 'expected 6 items since we scatter three requests');
        
               }
	       test.done();
               server.close();
            });
        });
    },

    'select-context-lookup': function(test) {
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
            var engine = new Engine({
                connection : 'close'
            });
	    var q = fs.readFileSync(__dirname + '/mock/scatter.ql', 'UTF-8');
            engine.exec({
                context: {
                    times: 2
                 },
                 script: q,
                 cb : function(err, list) {
                    if(err) {
                       console.log(err.stack || err);
                       test.fail('got error: ' + err.stack || err);
                      
                     }
                     else {
                       test.equals(list.headers['content-type'], 'application/json', 'HTML expected');
                       test.ok(_.isArray(list.body), 'expected an array');
                       test.equals(list.body.length, 4, 'expected 4 items since we scatter two requests');
                      
                     }
		     test.done();
                     server.close();
                 }
             });
        });
    }
};
