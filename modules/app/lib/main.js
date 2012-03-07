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

'use strict';

var cluster = require('cluster'),
    os = require('os'),
    fs = require('fs'),
    util = require('util'),
    WebSocketServer = require('websocket').server,
    _ = require('underscore'),
    program = require('commander'),
    express = require('express'),
    Console = require('ql.io-console'),
    ecv = require('ql.io-ecv'),
    assert = require('assert'),
    misc = require('./misc.js');

// Trap all uncaught exception here.
process.on('uncaughtException', function(error) {
    // TODO: This has to the log file
    console.log(error.stack || error);
});

exports.version = require('../package.json').version;

exports.exec = function(cb, opts) {
    var c, monPort, port, master;

    // Process command line args.
    var cwd = process.cwd();
    program.option('-C, --cluster', 'run in cluster').
        option('-c, --config <configFile>', 'path to config', cwd + '/../config/dev.json').
        option('-p, --port <port>', 'port to bind to', 3000).
        option('-m, --monPort <monPort>', 'port for monitoring', 3001).
        option('-t, --tables <tables>', 'path of dir containing tables', cwd + '/../tables').
        option('-r, --routes <routes>', 'path of dir containing routes', cwd + '/../routes').
        option('-x, --xformers <xformers>', 'path of dir containing xformers', cwd + '/../xformers').
        option('-a, --ecvPath <ecvPath>', 'ecv path', '/ecv').
        option('-e, --disableConsole', 'disable the console', false).
        option('-q, --disableQ', 'disable /q', false);
    if(opts) {
        _.each(opts, function(opt) {
            program.option(opt[0], opt[1], opt[2], opt[3]);
        })
    }
    program.parse(process.argv);
    port = parseInt(program.port);

    if(program.cluster) {
        monPort = parseInt(program.monPort);
        master = new Master({
            pids: process.cwd() + '/pids',
            logs: process.cwd() + '/logs',
            port: port,
            monPort: monPort
        });

        if(process.argv.indexOf('stop') >= 0) {
            master.stop()
        }
        else if(process.argv.indexOf('shutdown') >= 0) {
            master.shutdown();
        }
        else {
            c = createConsole(program, function(app, emitter) {
                ecv.enable(app, port, program.ecvPath);
                master.listen(app, function() {
                    console.log('Listening on ' + port);
                    if(cb) {
                        cb(app, program, emitter);
                    }
                });

            });
        }
    }
    else {
        c = createConsole(program, function(app, emitter) {
            ecv.enable(app, port, program.ecvPath);
            app.listen(port, function() {
                console.log('Listening on ' + port);
                cb(app, program, emitter);
            });
        });
    }
}

//
// Master process
//
function Master(options) {
    this.options = options || {};

    // Stats
    this.stats = {
        inRequests: 0,
        outRequests: 0,
        inResponses: 0,
        outResponses: 0,
        connectionsTotal: 0,
        activeConnections: 0,
        restarts: 0,
        workersKilled: 0,
        host: os.hostname(),
        os: os.type(),
        noWorkers: 0,
        workers: {}
    };

    this.killall = function(signal) {
        var that = this, fullname;
        fs.readdir(that.options.pids, function(err, paths) {
            var count = paths.length;
            if(count === 0) {
                return;
            }
            var mf = _.find(paths, function(path) {
                return /master\./.test(path);
            });
            paths.forEach(function(filename) {
                fullname = that.options.pids + '/' + filename;
                if(/worker\./.test(filename)) {
                    that.kill(fullname, signal, function() {
                        count = count - 1;
                        if(count === 1 && mf) {
                            process.nextTick(function() {
                                that.kill(that.options.pids + '/' + mf, signal);
                            })
                        }
                    });
                }
                else if(/worker\./.test(filename)) {
                    mf = fullname;
                }
            });
        })
    };

    this.kill = function(fullname, signal, f) {
        fs.readFile(fullname, 'ascii', function(err, data) {
            var pid = parseInt(data);
            if(pid === process.pid) {
                fs.unlinkSync(fullname);
                process.exit(0);
            }
            else {
                try {
                    process.kill(pid, signal);
                }
                catch(e) {
                }
            }
            fs.unlink(fullname, function(err) {
                if(err) {
                    console.log('Unable to delete ' + fullname);
                }
                if(f) {
                    assert.ok('function' === typeof f);
                    f();
                }
            });
        });
    };

    this.createWorker = function () {
        var worker = cluster.fork();
        var that = this;
        fs.writeFileSync(this.options.pids + '/worker.' + worker.pid + '.pid', worker.pid);

        //
        // Collect events from workers
        worker.on('message', function (message) {
                switch(message.event) {
                    case 'ack':
                        that.stats.workers[message.pid].inRequests++;
                        that.stats.inRequests++;
                        break;
                    case 'script-done':
                        that.stats.workers[message.pid].outResponses++;
                        that.stats.outResponses++;
                        break;
                    case 'statement-request':
                        that.stats.workers[message.pid].outRequests++;
                        that.stats.outRequests++;
                        break;
                    case 'statement-response':
                        that.stats.workers[message.pid].inResponses++;
                        that.stats.inResponses++;
                        break;
                }
            }
        );

        this.stats.workers[worker.pid] = {
            pid: worker.pid,
            start: new Date(),
            inRequests: 0,
            outResponses: 0,
            outRequests: 0,
            inResponses: 0,
            connectionsTotal: 0,
            connectionsActive: 0
        };
        this.stats.noWorkers++;
    }
}

Master.prototype.listen = function(app, cb) {
    if(cluster.isMaster) {
        misc.ensureDir(process.cwd() + '/pids', true); // Ensure pids dir
        misc.ensureDir(process.cwd() + '/logs'); // Ensure logs dir

        this.stats.pid = process.pid;
        this.stats.start = new Date();
        this.stats.totalmem = os.totalmem();
        this.stats.freemem = os.freemem();
        fs.writeFileSync(this.options.pids + '/master.' + this.stats.pid + '.pid', this.stats.pid);

        // Fork workers.
        var noWorkers = os.cpus().length;
        for(var i = 0; i < noWorkers; i++) {
            this.createWorker();
        }

        var that = this;
        var deathWatcher = function (worker) {
            that.stats.workersKilled++;
            that.stats.noWorkers--;
            that.createWorker();
            delete that.stats.workers[worker.pid];
        };
        cluster.on('death', deathWatcher);

        var monitor = new Monitor({
            stats: that.stats,
            port: that.options.monPort || '8081',
            path: that.options.monPath || '/'}
        );

        process.on('SIGINT', function() {
            cluster.removeListener('death', deathWatcher);
            cluster.on('done', function() {

            })
            that.killall('SIGINT');
        });
        monitor.listen(cb);
    }
    else {
        // Worker processes have a http server.
        app.listen(this.options.port, cb);
    }
};

Master.prototype.stop = function() {
    this.killall('SIGKILL');
};

Master.prototype.shutdown = function() {
    this.killall('SIGTERM');
};


//
// Monitor
//
function Monitor(options) {
    this.options = options || {port: 8081, stats: {}, path: '/'};
    this.stats = this.options.stats;
}
Monitor.prototype.listen = function(cb) {
    var that = this;
    var app = express.createServer();
    app.configure(function () {
        app.set('views', __dirname + '/../public/views');
        app.use(express.static(__dirname + '/../public'));
        app.set('view engine', 'html');
        app.register('.html', require('ejs'));
    });

    app.get(this.options.path, function (req, res) {
        var accept = (req.headers || {}).accept || '';
        if(accept.search('json') > 0) {
            res.contentType('application/json');
            res.send(JSON.stringify(getStats(that.stats, req.connection)));
        }
        else {
            res.render('index.ejs', getStats(that.stats, req.connection));
        }
    });

    app.get(/^\/logs?(?:\/(\d+)(?:\.\.(\d+))?)?/, function (req, res) {
        var root, paths, logs, stats;
        var file = process.cwd() + req.url;
        if(req.url === '/logs') {
            root = process.cwd() + '/logs';
            paths = fs.readdirSync(root);
            logs = [];
            paths.forEach(function (filename) {
                stats = fs.statSync(root + '/' + filename);
                logs.push({
                    filename: filename,
                    stats: stats
                })
            });
            var data = getStats(that.stats, req.connection);
            data.logs = logs;
            res.render('logs.ejs', data);
        }
        else {
            var stat = fs.statSync(file);
            res.writeHead(200, {
                'Content-Type': 'text/plain',
                'Content-Length': stat.size
            });
            var readStream = fs.createReadStream(file);
            util.pump(readStream, res, function (e) {
                if(e) {
                    console.log(e.stack || e);
                }
                res.end();
            });
        }
    });

    app.get('/deps', function(req, res) {
        var npm = require('npm');
        npm.load({}, function() {
            npm.commands.ls({}, true, function(e, data) {
                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });

                var seen = []
                var out = JSON.stringify(data, function (k, o) {
                    if(typeof o === "object") {
                        if(-1 !== seen.indexOf(o)) return '[Circular]';
                        seen.push(o);
                    }
                    return o;
                }, 2);
                res.end(out);
            });
        });
    });

    app.listen(this.options.port, cb);

    var wsServer = new WebSocketServer({
        httpServer: app,
        autoAcceptConnections: false
    });

    wsServer.on('request', function (request) {
        var connection = request.accept('ql.io-mon', request.origin);
        var update = setInterval(function () {
            connection.sendUTF(JSON.stringify(getStats(that.stats, connection.socket)));
        }, 1000);
        connection.on('close', function () {
            clearInterval(update);
        });
    });
}

function getStats(master, socket) {
    master.averageLoad = os.loadavg().map(
                    function (n) {
                        return n.toFixed(2);
                    }).join(' ');
    master.coresUsed = _.size(master.workers) + ' of ' + os.cpus().length;
    master.memoryUsageAtBoot = misc.forMemoryNum(master.freemem) + ' of ' +
                    misc.forMemoryNum(master.totalmem);
    master.totalMem = os.totalmem().toFixed(3);
    master.currentMemoryUsage = (os.totalmem() - os.freemem()) / 1024000;
    master.hostCpu = (_.reduce(os.cpus(), function (memo, cpu) {
                    return memo + (cpu.times.user /
                        (cpu.times.user + cpu.times.nice +
                            cpu.times.sys + cpu.times.idle + cpu.times.irq));
                }, 0) * 100 / os.cpus().length).toFixed(2);

    if(socket) {
        master.address = socket.address();
    }
    return {master: master};
}

function getInflight(master) {
    return getStats(master);
}


function createConsole(program, cb) {
    var disableConsole = Boolean(program.disableConsole);
    var disableQ = Boolean(program.disableQ);
    return new Console({
        'tables': program.tables,
        'routes': program.routes,
        'config': program.config,
        'xformers': program.xformers,
        'enable console': !disableConsole,
        'enable q': !disableQ,
        'log levels': require('winston').config.syslog.levels}, cb);
}



