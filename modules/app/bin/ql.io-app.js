#!/usr/bin/env node

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

var Console = require('ql.io-console'),
    mon = require('ql.io-mon'),
    cluster = require('cluster'),
    logger = require('winston'),
    ecv = require('ql.io-ecv'),
    fs = require('fs');

//
// Trap all uncaught exception here.
//
process.on('uncaughtException', function(error) {
    console.log(error.stack || error);
})

//
// Use commander to process command line args.
var cwd = process.cwd();
var program = require('commander');
program.
    option('-C, --cluster', 'run in cluster').
    option('-c, --config <configFile>', 'path to config', cwd + '/../config/dev.json').
    option('-p, --port <port>', 'port to bind to', 3000).
    option('-m, --monPort <monPort>', 'port for monitoring', 3001).
    option('-t, --tables <tables>', 'path of dir containing tables', cwd + '/../tables').
    option('-r, --routes <routes>', 'path of dir containing routes', cwd + '/../routes').
    option('-e, --disableConsole', 'disable the console', false).
    parse(process.argv);

//
// We use the same script for start, shutdown and stop tasks
// So, skip some steps if we are stopping or shutting down the server.
var stopping = process.argv.indexOf('stop') >= 0 || process.argv.indexOf('shutdown') >= 0;
var c;
if(stopping) {
    // If stopping, create a barebones app.
    c = new Console();
}
else {
    // Else create the fully fledged app.
    var disableConsole = Boolean(program.disableConsole);
    c = new Console({
        'tables': program.tables,
        'routes': program.routes,
        'config': program.config,
        'enable console': !disableConsole,
        'log levels': require('winston').config.syslog.levels
    });
    // Enable ecv checks
    ecv.enable(c.app, program.port);
}

// Utility to ensure that certain directories exist
function ensure(dir) {
    try {
        fs.readdirSync(dir);
    }
    catch(e) {
        fs.mkdirSync(dir, 0755);
    }
}

var port = parseInt(program.port);
var monPort = parseInt(program.monPort);

// If the script includes --cluster, start the cluster.
if(program.cluster) {
    ensure(process.cwd() + '/pids'); // Ensure pids dir
    ensure(process.cwd() + '/logs'); // Ensure logs dir
    var capp = cluster(c.app)
        .set('working directory', process.cwd())
        .set('socket path', process.cwd() + '/pids')
        .use(cluster.debug())
        .use(cluster.logger(process.cwd() + '/logs', 'debug'))
        .use(cluster.stats({ connections:true, requests:true }))
        .use(cluster.pidfiles(process.cwd() + '/pids'))
        .use(cluster.cli())
        .use(cluster.repl(3002));
    if(!stopping) {
        capp.use(mon({
            port: monPort,
            repl:cluster.repl,
            updateInternal:500,
        }));
    }
    capp.listen(port, function() {
        console.log('Listening on ' + port);
    });
}
else {
    c.app.listen(port, function() {
        console.log('Listening on ' + port);
    })
}

// Export the app, so that we can build sites using ql.io
module.exports = c.app

if(stopping) {
    console.log('Stopping');
    // This should not be necessary - but mon module is holding up the event loop on shutdown.
    process.exit(0);
}
