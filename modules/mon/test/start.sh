#!/usr/bin/env node

//B''H
var express = require('express'),
    mon = require('../lib/mon'),
    cluster = require('cluster'),
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var app = express.createServer();

app.get('/', function(req, res) {
    res.send('Hello World!')
});


cluster(app)
    .set('working directory', '.')
    .use(cluster.stats({ connections: true, requests: true }))
    .use(mon({port: 3037, repl: cluster.repl, updateInternal: 500}))
    .use(cluster.repl(3038))
    .listen(3036);




