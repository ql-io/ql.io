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

var Cluster = require('cluster2'),
    fs = require('fs'),
    winston = require('winston'),
    os = require('os'),
    _ = require('underscore'),
    program = require('commander'),
    Console = require('ql.io-console'),
    assert = require('assert');

// Trap all uncaught exception here.
process.on('uncaughtException', function(error) {
    // TODO: Report to logger
    console.log(error.stack || error);
});

exports.version = require('../package.json').version;

exports.exec = function() {
    var loggerFn, cb, opts;
    if(arguments.length === 1) {
        cb = arguments[0];
    }
    else if(arguments.length === 2) {
        cb = arguments[0];
        opts = arguments[1];
    }
    else if(arguments.length === 3) {
        loggerFn = arguments[0];
        cb = arguments[1];
        opts = arguments[2];
    }

    loggerFn = loggerFn || addFileLoggers;

    // Process command line args.
    var cwd = process.cwd();
    program.option('-C, --cluster', 'run in cluster').
        option('-c, --config <configFile>', 'path to config', cwd + '/../config/dev.json').
        option('-p, --port <port>', 'port to bind to', 3000).
        option('-m, --monPort <monPort>', 'port for monitoring', 3001).
        option('-t, --tables <tables>', 'path of dir containing tables', cwd + '/tables').
        option('-r, --routes <routes>', 'path of dir containing routes', cwd + '/routes').
        option('-x, --xformers <xformers>', 'path of dir containing xformers', cwd + '/config/xformers.json').
        option('-a, --ecvPath <ecvPath>', 'ecv path', '/ecv').
        option('-n, --noWorkers <noWorkers>', 'no of workers', os.cpus.length).
        option('-e, --disableConsole', 'disable the console', false).
        option('-q, --disableQ', 'disable /q', false);
    if(opts) {
        _.each(opts, function(opt) {
            program.option(opt[0], opt[1], opt[2], opt[3]);
        })
    }
    program.parse(process.argv);

    var options = {
        cluster: program.cluster,
        port: parseInt(program.port),
        monPort: parseInt(program.monPort),
        config: program.config,
        tables: program.tables,
        routes: program.routes,
        xformers: program.xformers,
        disableConsole: program.disableConsole,
        disableQ: program.disableQ,
        noWorkers: program.noWorkers,
        ecvPath: program.ecvPath,
        'request-id': program.requestId || 'Request-ID',
        loggerFn: loggerFn,
        ecv: {
            monitor: '/tables',
            validator: function(status, headers, data) {
                return JSON.parse(data);
            }
        },
        timeout: 300 * 1000 // Idle client socket timeout
    };
    options.__proto__ = program;

    var cluster = new Cluster(options);
    if(process.argv.indexOf('stop') >= 0) {
        cluster.stop(options);
    }
    else if(process.argv.indexOf('shutdown') >= 0) {
        cluster.shutdown(options);
    }
    else {
        var emitter;
        cluster.listen(
            // Create an app and call back
            function(cb2) {
                createConsole(options, cluster, function(app, e) {
                    emitter = e;
                    cb2(app);
                })
            },
            // Cluster is ready
            function(app) {
                if(cb) {
                    cb(app, program, emitter);
                }
            }
        );
    }
}

exports.addFileLoggers = addFileLoggers;
function addFileLoggers(options, emitter) {
    // Attach listeners for logging
    // Ensure logs dir.
    var logdir = false;
    try {
        fs.readdirSync(process.cwd() + '/logs');
        logdir = true;
    }
    catch(e) {
        try {
            fs.mkdirSync(process.cwd() + '/logs/', parseInt('755', 8));
            logdir = true;
        }
        catch(e) {
        }
    }
    var logger = createLogger(logdir, '/logs/ql.io.log');
    var accessLogger = createLogger(logdir, '/logs/access.log');
    var errLogger = createLogger(logdir, '/logs/error.log');
    var proxyLogger = createLogger(logdir, '/logs/proxy.log');

    logger.setLevels(winston.config.cli.levels);
    emitter.on('ql.io-begin-event', function (event, message) {
        if(_.isObject(message)) {
            message.eventId = event.eventId;
            message.pid = process.pid;
        }
        if(event.type === 'URL') {
            accessLogger.info(message)
        }
        else if(event.name === 'http-request') {
            proxyLogger.info(message)
        }
    });
    emitter.on('ql.io-end-event', function (event, message) {
        if(_.isObject(message)) {
            message.eventId = event.eventId;
            message.pid = process.pid;
            message.duration = event.duration;
        }
        if(event.type === 'URL') {
            accessLogger.info(message)
        }
        else if(event.name === 'http-request') {
            proxyLogger.info(message)
        }
    });

    emitter.on('ql.io-event', function (event, message) {
        logger.info(message || event);
    });

    emitter.on('info', function (event, message) {
        logger.info(message || event);
    });

    emitter.on('ql.io-error', function (event, message, err) {
        errLogger.info(message || event);
        if(err) {
            errLogger.error(err.stack || err);
        }
    });
    emitter.on('error', function (event, message) {
        errLogger.error(message || event);
    });

    emitter.on('fatal', function (event, message) {
        errLogger.error(message || event);
    });

    emitter.on('ql.io-warning', function (event, message) {
        var warn = errLogger.warn || errLogger.warning;
        warn(message || event);
    });
    emitter.on('warning', function (message) {
        var warn = errLogger.warn || errLogger.warning;
        warn(message);
    });
}

function createConsole(options, cluster, cb) {
    var disableConsole = Boolean(program.disableConsole);
    var disableQ = Boolean(program.disableQ);
    return new Console({
        loggerFn: function(emitter) {
            // Add loggers
            options.loggerFn.call(null, options, emitter);

            // Listen to cluster events
            cluster.on('died', function(pid) {
                emitter.emit('fatal', {
                    pid: pid,
                    message: 'Process died'
                });
            });
            cluster.on('forked', function(pid) {
                emitter.emit('info', {
                    pid: pid,
                    message: 'Worker forked'
                });
            });
            cluster.on('SIGTERM', function(pid) {
                emitter.emit('info', {
                    signal: 'SIGTERM',
                    pid: pid,
                    message: 'Shutting down'
                });
            });
            cluster.on('warning', function(message) {
                emitter.emit('warning', message);
            })
        },
        'tables': program.tables,
        'routes': program.routes,
        'config': program.config,
        'xformers': program.xformers,
        'enable console': !disableConsole,
        'enable q': !disableQ,
        'request-id': program.requestId,
        'log levels': require('winston').config.syslog.levels}, cb);
}

function createLogger(logdir, name) {
    var logger = logdir ? new (winston.Logger)({
        transports: [
            new (winston.transports.File)({
                filename: process.cwd() + name,
                maxsize: 1024000 * 5,
                colorize: false,
                json: true,
                timestamp: function () {
                    return new Date();
                }
            })
        ]
    }) : new (winston.Logger)();
    return logger;
}


