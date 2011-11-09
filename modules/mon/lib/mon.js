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

var cluster = require('cluster'),
    os = require('os'),
    fs = require('fs'),
    util = require('util'),
    express = require('express'),
    procEmitter = process.EventEmitter(),
    WebSocketServer = require('websocket').server,
    _ = require('underscore');

module.exports = function(options) {
    var repl, initFunc;
    mon.enableInWorker = true;
    repl = options.repl || cluster.repl
    initFunc = options.initFunc || function () {
    };

    try {
        (initFunc)()
    } catch(err) {
    }

    addReplFunctions(repl);

    options = options || {};

    function mon(master) {
        if (master.isWorker) {
            master.server.on('listening', function() {
                master.call('processMonInfo', packMonInfo());
            });
            master.server.on('connection', function(sock) {
                master.call('processMonInfo', packMonInfo());
                sock.on('close', function() {
                    master.call('processMonInfo', packMonInfo());
                });
            });

            setInterval(function() {
                process.EventEmitter().emit('ql.io-heart-beat', null,
                    'process=worker&status=running&id='+process.pid);
            }, 60000);

            //
            // Listen for incoming and outgoing HTTP requests (fan out) - maintain in the process scope.
            process.counters = process.counters || {inRequests:0, outRequests: 0, inResponses: 0, outResponses: 0};
            process.inflight = {};

            procEmitter.on('ql.io-script-ack', function() {
                process.counters.inRequests++;
                master.call('processMonInfo', packMonInfo());
            });
            procEmitter.on('ql.io-statement-request', function(packet) {
                process.counters.outRequests++;
                process.inflight[packet.uuid] = packet.uri;
                master.call('processMonInfo', packMonInfo());
            });
            procEmitter.on('ql.io-statement-response', function(packet) {
                process.counters.inResponses++;
                delete process.inflight[packet.uuid];
                master.call('processMonInfo', packMonInfo());
            });
            procEmitter.on('ql.io-script-done', function() {
                process.counters.outResponses++;
                master.call('processMonInfo', packMonInfo());
            });
        } else {
            master.pid = process.pid;
            master.processMonInfo = function(worker, data) {
                master.emit('monInfo', worker, data);
                worker.monInfo = _.extend(worker.monInfo || {}, data);
                if (master.closeAtZeroConnection && !_.reduce(master.children, function(memo, worker) {
                    return memo + worker.stats.connectionsActive;
                }, 0)) {
                    master.close();
                }
            }

            launchMon(master, options.port || '8181', options.url || '/', options);
            setInterval(function() {
                var stats = JSON.stringify(getStats(master));
                process.EventEmitter().emit('ql.io-heart-beat', null, 'process=master&status=running&stats='+stats);
            }, options.heartbeatInternal || 60000);

        }
    }

    return mon;
}

function launchMon(master, port, url, options) {
    var app = express.createServer();

    app.configure(function() {
        app.set('views', __dirname + '/../public/views');
        app.use(express.static(__dirname + '/../public'));
        app.set('view engine', 'html');
        app.register('.html', require('ejs'));
    });

    app.get(url, function(req, res) {
        var accept = (req.headers || {}).accept || '';
        if (accept.search('json') > 0) {
            res.send(JSON.stringify(getStats(master)));
        } else {
            res.render('index.ejs', getStats(master));
        }
    });

    app.get(url + 'in-flight', function(req, res) {
        var accept = (req.headers || {}).accept || '';
        if (accept.search('json') > 0) {
            res.send(JSON.stringify(getInflight(master)));
        } else {
            res.render('in-flight.ejs', getInflight(master));
        }
    });

    app.get(/^\/logs?(?:\/(\d+)(?:\.\.(\d+))?)?/, function(req, res) {
        var root, paths, logs, stats;
        var file = process.cwd() + req.url;
        if(req.url === '/logs') {
            root = process.cwd() + '/logs';
            paths = fs.readdirSync(root);
            logs = [];
            paths.forEach(function(filename) {
                stats = fs.statSync(root + '/' + filename);
                logs.push({
                    filename: filename,
                    stats: stats
                })
            });
            res.render('logs.ejs', {
                logs: logs,
                master: {
                    os: os.type(),
                    started: master.stats.start.toUTCString(),
                    host: os.hostname(),
                    state: master.state,
                    pid: master.pid
                }
            });
        }
        else {
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type' : 'text/plain',
                'Content-Length' : stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function(e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        }
    });

    var hashSlash = url.substr(-1) === '/';

    var politeShutdownUrl = url + (hashSlash ? 'shutdown/polite' : '/shutdown/polite');
    app.get(politeShutdownUrl, function(req, res) {
        master.closeAtZeroConnection = true;
        res.send('Server will shutdown when all connections close!');
        if (!_.reduce(master.children, function(memo, worker) {
            return memo + worker.stats.connectionsActive;
        }, 0)) {
            master.close();
        }
    });

    var hardShutdownUrl = url + (hashSlash ? 'shutdown/hard/:interval' : '/shutdown/hard/:interval');
    app.get(hardShutdownUrl, function(req, res) {
        var interval = parseInt(req.params.interval) || 5;
        interval = interval < 0 ? 5 : interval;

        res.send('Shutting done in ' + interval + ' Seconds!');

        var shutInterval = setInterval(function() {
            master.close();
            clearInterval(shutInterval);
        }, interval * 1000);
    });

    app.listen(port);

    var wsServer = new WebSocketServer({
        httpServer: app,
        autoAcceptConnections: false
    });

    wsServer.on('request', function(request) {
        var connection = request.accept('ql.io-mon', request.origin);
        var update = setInterval(function() {
            connection.sendUTF(JSON.stringify(getStats(master)));
        }, 200);
        connection.on('close', function() {
            clearInterval(update);
        });
    });
}

function getStats(master) {
    return _.extend({},
        {
            master : {
                host: os.hostname(),
                os: os.type(),
                state: master.state,
                pid: master.pid,
                started: master.stats.start.toUTCString(),
                restarts: master.stats.restarts,
                workers: master.children.length,
                workersKilled: master.stats.workersKilled,
                averageLoad: os.loadavg().map(
                    function(n) {
                        return n.toFixed(2);
                    }).join(' '),
                coresUsed: master.children.length + ' of ' + os.cpus().length,
                memoryUsageAtBoot: forMemoryNum(master.stats.freemem) + ' of ' +
                    forMemoryNum(master.stats.totalmem),
                totalMem: os.totalmem().toFixed(3),
                currentMemoryUsage: (os.totalmem() - os.freemem())/1024000,
                hostCpu: (_.reduce(os.cpus(), function(memo, cpu) {
                    return memo + (cpu.times.user /
                        (cpu.times.user + cpu.times.nice +
                            cpu.times.sys + cpu.times.idle + cpu.times.irq));
                }, 0) * 100 / os.cpus().length).toFixed(2)
            },
            workers : _.map(master.children, function(worker) {
                return _.extend(_.extend({}, worker.stats), worker.monInfo);
            })
        });
}

function getInflight(master) {
   return _.extend({},
        {
            master : {
                host: os.hostname(),
                started: master.stats.start.toUTCString(),
                os: os.type(),
                pid: master.pid
            },
            workers : _.map(master.children, function(worker) {
                return _.extend(_.extend({}, worker.stats), worker.monInfo);
            })
        });
}

function packMonInfo() {
    var data = {};

    var memory = process.memoryUsage();

    data.totalProcMemoryWithSwap = forMemoryNum(memory.vsize);
    data.totalProcMemoryWithoutSwap = forMemoryNum(memory.rss);
    data.memoryHeapAvailablToV8Engine = forMemoryNum(memory.heapTotal);
    data.memoryHeapUsedByV8Engine = forMemoryNum(memory.heapUsed);
    data.inRequests = process.counters.inRequests;
    data.outResponses = process.counters.outResponses;
    data.outRequests = process.counters.outRequests;
    data.inResponses = process.counters.inResponses;
    data.pid = process.pid;
    data.inflight = process.inflight;
    return data;
}

function forMemoryNum(memory) {
    var strMemory;
    if (memory < 1024) {
        strMemory = memory + ' Bytes';
    }
    if (memory < 1024 * 1024) {
        strMemory = (memory / 1024).toFixed(2) + ' KB';
    }
    else {
        strMemory = (memory / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return strMemory;
}

function addReplFunctions(repl) {
    repl.define('mon', function(master, sock) {
        _.each(master.children, function(worker) {
            sock.title('Worker: ' + worker.id);

            var rowKeyValue = function(value, key) {
                sock.row(key, value);
            };

            _.each(worker.stats || {}, rowKeyValue);

            _.each(worker.monInfo || {}, rowKeyValue);
        });
    }, "Ql.io Mon");

    repl.define('politeShutdown', function(master, sock) {
        sock.write('Will Shutdown When all connections close\n');
        master.closeAtZeroConnection = true;
        if (!_.reduce(master.children, function(memo, worker) {
            return memo + worker.stats.connectionsActive;
        }, 0)) {
            master.close();
        }
    }, 'Will Shutdown When all connections close');
}
