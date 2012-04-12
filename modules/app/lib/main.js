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

var cluster2 = require('cluster2'),
    os = require('os'),
    _ = require('underscore'),
    program = require('commander'),
    Console = require('ql.io-console'),
    assert = require('assert');

// Trap all uncaught exception here.
process.on('uncaughtException', function(error) {
    // TODO: This has to the log file
    console.log(error.stack || error);
});

exports.version = require('../package.json').version;

exports.exec = function(cb, opts) {

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
        ecv: {
            monitor: '/tables',
            validator: function(status, headers, data) {
                return JSON.parse(data);
            }
        }
    };

    if(process.argv.indexOf('stop') >= 0) {
        cluster2.stop(options);
    }
    else if(process.argv.indexOf('shutdown') >= 0) {
        cluster2.shutdown(options);
    }
    else {
        var emitter;
        cluster2.listen(options, function(cb2) {
            createConsole(program, function(app, e) {
                emitter = e;
                cb2(app);
            })
        }, function(app) {
            if(cb) {
                cb(app, program, emitter);
            }
        });
    }
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
        'request-id': program.requestId,
        'log levels': require('winston').config.syslog.levels}, cb);
}



