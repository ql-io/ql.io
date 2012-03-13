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

var _    = require('underscore'),
    util = require('util'),
    http = require('http');

var Engine = require('../lib/engine');

var cooked = {
    partialfailure : {
            ports: [

            ],
            script: 'create table state on select get from "http://localhost:3000/{^mode}";'+
                    'list = ["ok", "fail"];'+
                    'return select * from state where mode in ("{list}");',

            udf: {
                setup : function (cb){
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
                        cb({server:server});
                    });
                },
                test : function (test, err, result,ctx) {
                    if(err) {
                        test.fail('got error: ' + err.stack || err);
                    }
                    else {
                        test.ok(true);
                    }

                },
                tearDown : function(cb, ctx){
                    ctx.server.close();
                    cb();
                }
            }

    }

}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({
    })
})