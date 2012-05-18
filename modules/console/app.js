/*
 * Copyright 2012 eBay Software Foundation
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

var winston = require('winston'),
    express = require('express'),
    browserify = require('browserify'),
    headers = require('headers'),
    fs = require('fs'),
    os = require('os'),
    util = require('util'),
    sanitize = require('validator').sanitize,
    connect = require('connect'),
    expat = require('xml2json'),
    assetManager = require('connect-assetmanager'),
    assetHandler = require('connect-assetmanager-handlers'),
    Engine = require('ql.io-engine'),
    MutableURI = require('ql.io-mutable-uri'),
    _ = require('underscore'),
    WebSocketServer = require('websocket').server,
    compress = require('./lib/compress.js').compress,
    formidable = require('formidable'),
    cacheUtil = require('./lib/cache-util.js');

exports.version = require('./package.json').version;

process.on('uncaughtException', function(error) {
    winston.error(error.stack);
});

var skipHeaders = ['connection', 'host', 'referer', 'content-length', 'accept', 'accept-charset',
    'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
    'transfer-encoding', 'upgrade'];

var Console = module.exports = function(opts, cb) {

    opts = opts || {};

    var cache = opts.cache = cacheUtil.startCache(opts.config);

    var engine = new Engine(opts);

    var app = this.app = express.createServer();

    // Remains true until the app receives a 'close' event. Once this event is received, the app
    // sends 'connection: close' on responses (except for express served responses) and ends
    // the connection. See the app.on('close') handler below.
    var serving;
    app.on('listening', function() {
        serving = true;
    });

    app.enable('case sensitive routes'); // Default routes are not case sensitive

    // Add parser for xml
    connect.bodyParser.parse['application/xml'] = function(req, options, next) {
        var buf = '';
        req.setEncoding('utf8');
        req.on('data', function (chunk) {
            buf += chunk
        });
        req.on('end', function () {
            try {
                req.body = expat.toJson(buf, {coerce: true, object: true});
                next();
            }
            catch(err) {
                next(err);
            }
        });
    };

    connect.bodyParser.parse['opaque'] = function(req, options, next) {
        var buf = '';
        req.setEncoding('utf8');
        req.on('data', function (chunk) {
            buf += chunk
        });
        req.on('end', function () {
            try {
                req.body = buf;
                next();
            }
            catch(err) {
                next(err);
            }
        });
    };

    // Add parser for multipart
    var multiParser = function(req, options, next) {
        var form = new formidable.IncomingForm(), parts = [];


        form.onPart = function(part) {
            var chunks = [], idx = 0, size = 0;

            part.on('data', function(c) {
                chunks[idx++] = c;
                size += c.length;
            });

            part.on('end', function() {
                var buf = new Buffer(size), i = 0, idx = 0;
                while (i < chunks.length) {
                    idx = idx + chunks[i++].copy(buf, idx);
                }
                var p = { 'name' : part.name, 'size' : idx, 'data' : buf };
                parts.push(p);
            });

            part.on('error', function(err) {
                next(err);
            });
        }

        form.parse(req, function(err, fields, files) {
            req.body = parts.splice(0, 1); // by our convention the first part is the body
            req.parts = parts;
            if (err) {
                next(err);
            } else {
                next();
            }
        });
    };

    // Add parser for multipart requests
    connect.bodyParser.parse['multipart/form-data'] = multiParser;
    connect.bodyParser.parse['multipart/related'] = multiParser;
    connect.bodyParser.parse['multipart/mixed'] = multiParser;

    var bodyParser = connect.bodyParser();
    app.use(bodyParser); // parses the body for application/x-www-form-urlencoded and application/json
    var respHeaders = require(__dirname + '/lib/middleware/resp-headers');
    app.use(respHeaders());
    if(opts['enable console']) {
        // If you want unminified JS and CSS, jus add property debug: true to js and css vars below.
        var qlAssets = {
            'js': {
                'stale': true, // If set to false, this adds a watch file listener - which messes up shutdown via cluster.
                'route': /\/scripts\/all.js/,
                'path': __dirname + '/public/scripts/',
                'dataType': 'javascript',
                'files': [
                    'splitter.js',
                    'codemirror.js',
                    'qlio-editor.js',
                    'jquery.treeview.js',
                    'jsonview.js',
                    'mustache.js',
                    'har-viewer.js',
                    'console.js'
                ]
            },
            'css': {
                'stale': true, // If set to false, this adds a watch file listener - which messes up shutdown via cluster.
                'route': /\/css\/all.css/,
                'path': __dirname + '/public/css/',
                'dataType': 'css',
                'files': [
                    'console.css',
                    'codemirror.css',
                    'qlio-editor.css',
                    'treeview.css',
                    'har-viewer.css',
                    'jquery-ui.css',
                    'api.css'
                ],
                'preManipulate': {
                    // Regexp to match user-agents including MSIE.
                    'MSIE': [
                        assetHandler.yuiCssOptimize,
                        assetHandler.fixVendorPrefixes,
                        assetHandler.fixGradients,
                        assetHandler.stripDataUrlsPrefix
                    ],
                    // Matches all (regex start line)
                    '^': [
                        assetHandler.yuiCssOptimize,
                        assetHandler.fixVendorPrefixes,
                        assetHandler.fixGradients
                    ]
                }
            }
        };
        var qlAssetLoader = assetManager(qlAssets);
        app.use(qlAssetLoader);

        app.set('views', __dirname + '/public/views');
        app.use(express.static(__dirname + '/public'));
        app.set('view engine', 'html');
        app.register('.html', require('ejs'));

        // The require below has paths prepended so that they can be loaded relative to this
        // (console) module and not its dependents. If not, Node would look for those modules
        // in the app's node_modules, which introduces a dependency from app to these modules.
        app.use(browserify(
            {
                mount : '/scripts/compiler.js',
                require : [ 'ql.io-compiler',
                    'headers',
                    'mustache',
                    'events'],
                filter : require('uglify-js')
            }));
        app.get('/console', function(req, res) {
            res.render(__dirname + '/public/views/console/index.ejs', {
                title: 'ql.io',
                layout: 'console-layout',
                script: req.param('s') || '-- Type ql script here - all keywords must be in lower case'
            });
        });

        // Add the home page to the console app
        app.get('/', function(req, res) {
            res.redirect('/console');
        });
    }

    // register routes
    var routes = engine.routes.verbMap;
    _.each(routes, function(verbRoutes, uri) {
        _.each(verbRoutes, function(verbRouteVariants, verb) {
            engine.emit(Engine.Events.EVENT, {}, 'Adding route ' + uri + ' for ' + verb);
            app[verb](uri, function(req, res) {
                var holder = {
                    params: {},
                    headers: {},
                    parts: {},
                    routeParams: {},
                    connection: {
                        remoteAddress: req.connection.remoteAddress
                    }
                };

                // get all query params
                collectHttpQueryParams(req, holder, false);

                // find a route (i.e. associated cooked script)
                // routes that distinguish required and optional params
                var route = _(verbRouteVariants).chain()
                    .filter(function (verbRouteVariant){var defaultKeys = _.chain(verbRouteVariant.query)
                            .keys()
                            .filter(function(k){
                                return _.has(verbRouteVariant.routeInfo.defaults, verbRouteVariant.query[k]);
                            })
                            .value();
                        // missed query params that are neither defaults nor user provided
                        var missed = _.difference(_.keys(verbRouteVariant.query), _.union(defaultKeys, _.keys(holder.params)));
                        var misrequired = _.filter(missed, function(key){
                            if (verbRouteVariant.routeInfo.optparam){
                                // if with optional params, find if any required param is missed
                                return verbRouteVariant.query[key] && verbRouteVariant.query[key].indexOf("^") == 0;
                            }
                            else {
                                // everything is required
                                return missed;
                            }
                        });
                        return !misrequired.length;
                    })
                    .max(function (verbRouteVariant){
                        if (!verbRouteVariant.routeInfo.optparam){
                            return 0;
                        }
                        // with optional param
                        var matchCount = _.intersection(_.keys(holder.params), _.keys(verbRouteVariant.query)).length;
                        var requiredCount = _.filter(_.keys(verbRouteVariant.query), function(key){
                            return verbRouteVariant[key] && verbRouteVariant[key].indexOf("^") == 0;
                        }).length;
                        return matchCount - requiredCount;

                    })
                    .value();

                if (!route) {
                    res.writeHead(400, 'Bad input', {
                        'content-type' : 'application/json'
                    });
                    res.write(JSON.stringify({'err' : 'No matching route'}));
                    res.end();
                    return;
                }


                // collect default query params if needed
                _.each(route.routeInfo.defaults, function(defaultValue, queryParam){
                    holder.routeParams[queryParam] = defaultValue.toString();
                });
                var keys = _.keys(req.params);
                _.each(keys, function(key) {
                    holder.routeParams[key] = req.params[key];
                });

                _.each(route.query, function(queryParam, paramName) {
                    if (holder.params[paramName]){
                        holder.routeParams[queryParam] = holder.params[paramName].toString();
                    }
                    else if (!holder.routeParams[queryParam]){
                        holder.routeParams[queryParam] = null;
                    }
                });

                // collect headers
                collectHttpHeaders(req, holder);
                holder.connection = {
                    remoteAddress: req.connection.remoteAddress
                };

                holder.parts = req.parts;

                // Start the top level event
                var urlEvent = engine.beginEvent({
                    clazz: 'info',
                    type: 'route',
                    name: route.routeInfo.method.toUpperCase() + ' ' + route.routeInfo.path.value,
                    message: {
                        ip: req.connection.remoteAddress,
                        method: req.method,
                        path: req.url,
                        headers: req.headers
                    },
                    cb: function(err, results) {
                        return handleResponseCB(req, res, execState, err, results);
                    }
                });

                var execState = [];
                engine.execute(route.script,
                    {
                        request: holder,
                        route: uri,
                        context: req.body || {},
                        parentEvent: urlEvent.event
                    },
                    function(emitter) {
                        setupExecStateEmitter(emitter, execState, req.param('events'));
                        setupCounters(emitter);
                        emitter.on('end', urlEvent.cb);
                    }
                );
            });
        });
    });

    // HTTP indirection for 'show tables' command
    app.get('/tables', function(req,res){
        var holder = {
            headers: {}
        };

        var isJson = ((req.headers || {}).accept || '').search('json') > 0 ||
            (req.param('format') || '').trim().toLowerCase() === 'json';

        function routePage(res, execState, results){
            res.header['Link'] = headers.format('Link', {
                href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                rel : ['execstate']
            });
            res.render(__dirname + '/public/views/api/tables.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/api-layout',
                tables: results
            });
        }

        // Start the top level event
        var urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return isJson || err ?
                    handleResponseCB(req, res, execState, err, results) :
                    routePage(res,execState,results.body);
            }
        });

        var execState = [];
        engine.execute('show tables',
            {
                request: holder,
                parentEvent: urlEvent.event
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                setupCounters(emitter);
                emitter.on('end', urlEvent.cb);
            }
        );
    });

    // HTTP indirection for 'describe <table>' command  and it returns json (and not html)
    app.get('/table', function(req,res){
        var holder = {
            headers: {}
        };

        var isJson = ((req.headers || {}).accept || '').search('json') > 0 ||
            (req.param('format') || '').trim().toLowerCase() === 'json';

        function routePage(res, execState, result){
            res.header['Link'] = headers.format('Link', {
                href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                rel : ['execstate']
            });
            res.render(__dirname + '/public/views/api/tableInfo.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/api-layout',
                tableInfo: result,
                routes:
                    _(result.routes).chain()
                        .map(function(route){
                            var parse = new MutableURI(route);
                            return {
                                method: parse.getParam('method'),
                                path: parse.getParam('path'),
                                about: route
                            };
                        })
                        .value()
            });
        }

        var name = req.param('name');

        if (!name) {
            res.writeHead(400, 'Bad input', {
                'content-type' : 'application/json'
            });
            res.write(
                JSON.stringify({'err' : 'Missing table name: Usage /table?name=some-tablename'}
                ));
            res.end();
            return;
        }

        // Start the top level event
        var urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return isJson || err ?
                    handleResponseCB(req, res, execState, err, results) :
                    routePage(res,execState,results.body);
            }
        });

        var execState = [];
        engine.execute('describe' + decodeURIComponent(name),
            {
                request: holder,
                parentEvent: urlEvent.event
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                setupCounters(emitter);
                emitter.on('end', urlEvent.cb);
            }
        );
    });

    // HTTP indirection for 'show routes' command
    app.get('/api', function(req,res){
        var holder = {
            params: {},
            headers: {}
        };

        var isJson = ((req.headers || {}).accept || '').search('json') > 0 ||
            (req.param('format') || '').trim().toLowerCase() === 'json';

        function routePage(res, execState, results){
            res.header['Link'] = headers.format('Link', {
                href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                rel : ['execstate']
            });
            res.render(__dirname + '/public/views/api/api.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/api-layout',
                routes: results
            });
        }

        // Start the top level event
        var urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return isJson || err ?
                    handleResponseCB(req, res, execState, err, results) :
                    routePage(res,execState,results.body);
            }
        });

        var execState = [];
        engine.execute('show routes',
            {
                request: holder,
                parentEvent: urlEvent.event
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                setupCounters(emitter);
                emitter.on('end', urlEvent.cb);
            }
        );
    });

    // HTTP indirection for 'describe route "<route>" using method <http-verb>' command
    app.get('/route', function(req,res){
        var holder = {
            params: {},
            headers: {}
        };
        var path = req.param('path');
        var method = req.param('method');

        if (!path || !method) {
            res.writeHead(400, 'Bad input', {
                'content-type' : 'application/json'
            });
            res.write(
                JSON.stringify({'err' : 'Missing path name or method: Usage /route?path=some-path&method=http-method'}
                ));
            res.end();
            return;
        }

        var isJson = ((req.headers || {}).accept || '').search('json') > 0 ||
            (req.param('format') || '').trim().toLowerCase() === 'json';

        function routePage(res, execState, result){
            res.header['Link'] = headers.format('Link', {
                href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                rel : ['execstate']
            });
            res.render(__dirname + '/public/views/api/routeInfo.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/api-layout',
                routeInfo: result,
                related:
                    _(result.related).chain()
                        .map(function(route){
                            var parse = new MutableURI(route);
                            return {
                                method: parse.getParam('method'),
                                path: parse.getParam('path'),
                                about: route
                            };
                        })
                        .value(),
                tables:
                    _(result.tables).chain()
                        .map(function(table){
                            var parse = new MutableURI(table);
                            return {
                                name: parse.getParam('name'),
                                about: table
                            };
                        })
                        .value()
            });
        }

        // Start the top level event
        var urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return isJson || err ?
                    handleResponseCB(req, res, execState, err, results) :
                    routePage(res,execState,results.body);
            }
        });

        var execState = [];
        engine.execute('describe route "' + decodeURIComponent(path) + '" using method ' + method,
            {
                request: holder,
                parentEvent: urlEvent.event
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                setupCounters(emitter);
                emitter.on('end', urlEvent.cb);
            }
        );
    });

    /*
     * '/q' is disabled only if the console is created with config, 'enable q' : false.
     */
    var enableQ = opts['enable q'] === undefined ? true : opts['enable q'];

    var q =  function(req, res) {
        var holder = {
            params: {},
            headers: {},
            parts: {},
            connection: {
                remoteAddress: req.connection.remoteAddress
            }
        };
        var query = req.param('s');
        if (!query) {
            res.writeHead(400, 'Bad input', {
                'content-type' : 'application/json'
            });
            res.write(JSON.stringify({'err' : 'Missing query'}));
            res.end();
            return;
        }
        query = sanitize(query).str;
        collectHttpQueryParams(req, holder, true);
        collectHttpHeaders(req, holder);
        var urlEvent = engine.beginEvent({
            clazz: 'info',
            type: 'route',
            name: req.method.toUpperCase() + ' ' + req.url,
            message: {
                ip: req.connection.remoteAddress,
                method: req.method,
                path: req.url,
                headers: req.headers
            },
            cb: function(err, results) {
                return handleResponseCB(req, res, execState, err, results);
            }
        });
        var execState = [];
        engine.execute(query,
            {
                request: holder,
                parentEvent: urlEvent.event
            }, function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                emitter.on('end', urlEvent.cb);
            }
        );
    }


    if(enableQ) {
        app.get('/q', q);
        app.post('/q', q);
        app.put('/q', q);
        app.delete('/q', q);
        app.patch('/q', q);
    }

    // 404 Handling
    app.use(function(req, res, next) {
        compress(req, res);
        var msg = 'Cannot ' + req.method + ' ' + sanitize(req.url).xss();
        var accept = (req.headers || {}).accept || '';
        if (accept.search('json') > 0) {
            res.writeHead(404, {
                'content-type' : 'application/json'
            });
            res.write(JSON.stringify({ error: msg }));
            res.end();
            return;
        }
        res.writeHead(404, {
            'content-type' : 'text/plain'
        });
        res.write(msg);
        res.end();
    });

    // Error-handling middleware
    app.use(function(err, req, res, next){
        compress(req, res);
        // TODO call next() if recoverable, else next(err).
        var status = err.status || 500;
        var msg =  "Server Error - " + sanitize(err.msg || err).xss();
        var accept = (req.headers || {}).accept || '';
        if (accept.search('json') > 0) {
            res.writeHead(status, {
                'content-type' : 'application/json'
            });
            res.write(JSON.stringify({ error: msg }));
            res.end();
            return;
        }
        res.writeHead(status, {
            'content-type' : 'text/plain'
        });
        res.write(msg);
        res.end();
    });

    // Heartbeat - make sure to clear this on 'close'
    // TODO: Other details to include
    var heartbeat = setInterval(function () {
        engine.emit(Engine.Events.HEART_BEAT, {
            pid: process.pid,
            uptime: Math.round(process.uptime()),
            freemem: os.freemem()
        });
    }, 60000);

    // Let the Engine cleanup during shutdown
    app.on('close', function() {
        clearInterval(heartbeat);
        cacheUtil.stopCache(cache);
        serving = false;
    });

    // Also listen to WebSocket requests
    var server = new WebSocketServer({
        httpServer: app,
        autoAcceptConnections: false
    });
    server.on('request', function(request) {
        var connection = request.accept('ql.io-console', request.origin);
        var events = [];
        connection.on('message', function(message) {
            var event = JSON.parse(message.utf8Data);
            if(event.type === 'events') {
                var arr = event.data;
                try {
                    events = JSON.parse(arr);
                }
                catch(e) {
                    events = [];
                    _.each(Engine.Events, function(event) {
                        events.push(event);
                    })
                }
                connection.sendUTF(JSON.stringify({
                    type: 'events',
                    data: '{}'
                }));
            }
            else if (event.type === 'script') {
                var _collect = function(packet) {
                    // Writes events to the client
                    connection.sendUTF(JSON.stringify({
                        type: packet.type,
                        data: packet
                    }))
                }
                var script = event.data;
                engine.execute(script, {
                    request: {
                        headers: {},
                        params: {},
                        connection: {
                            remoteAddress: connection.remoteAddress
                        }
                    }
                }, function(emitter) {
                    _.each(events, function(event) {
                        emitter.on(event, _collect);
                    });
                    setupCounters(emitter);
                    emitter.on('end', function(err, results) {
                        if(err) {
                            var packet = {
                                headers: {
                                    'content-type': 'application/json'
                                },
                                body: err.stack || err
                            };
                            connection.sendUTF(JSON.stringify({
                                type: Engine.Events.SCRIPT_RESULT,
                                data: packet
                            }));
                        }
                        else {
                            connection.sendUTF(JSON.stringify({
                                type: Engine.Events.SCRIPT_RESULT,
                                data: results
                            }));
                        }
                        if(!serving) {
                            connection.end();
                        }
                    })
                })
            }
        });
        connection.on('close', function() {
            connection.close();
        });
    });

    function collectHttpQueryParams(req, holder, ignoreS) {
        // Collect req params (with sanitization)
        _.each(req.query, function(v, k) {
            if (ignoreS && k == 's') {
                return;
            }
            if (_.isArray(v)) {
                holder.params[k] = [];
                _.each(v, function(val) {
                    holder.params[k].push(sanitize(val).str);
                });
            }
            else {
                holder.params[k] = sanitize(v).str;
            }
        });
    }

    function collectHttpHeaders(req, holder) {
        // Collect req headers (with sanitization)
        _.each(req.headers, function(v, k) {
            if (skipHeaders.indexOf(k) === -1) {
                if (_.isArray(v)) {
                    holder.headers[k] = [];
                    _.each(v, function(val) {
                        holder.headers[k].push(sanitize(val).str);
                    });
                }
                else {
                    holder.headers[k] = sanitize(v).str;
                }
            }
        });
    }

    function setupExecStateEmitter(emitter, execState, eventParam) {
        var obj, events;
        try {
            obj = JSON.parse(eventParam);
            obj = obj.data;
            events = JSON.parse(obj);
        }
        catch(e) {
            events = [];
        }

        _.each(events, function(event) {
            emitter.on(event, function(packet) {
                execState.push(packet);
            });
        });
    }

    // Send to master
    function setupCounters(emitter) {
        if(process.send) {
            emitter.on(Engine.Events.SCRIPT_ACK, function(packet) {
                process.send({
                    type: 'counter',
                    name: Engine.Events.SCRIPT_ACK,
                    pid: process.pid});
            })
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(packet) {
                process.send({
                    type: 'counter',
                    name: Engine.Events.STATEMENT_REQUEST,
                    pid: process.pid});
            })
            emitter.on(Engine.Events.STATEMENT_RESPONSE, function(packet) {
                process.send({
                    type: 'counter',
                    name: Engine.Events.STATEMENT_RESPONSE,
                    pid: process.pid});
            })
            emitter.on(Engine.Events.SCRIPT_DONE, function(packet) {
                process.send({
                    type: 'counter',
                    name: Engine.Events.SCRIPT_DONE,
                    pid: process.pid});
            })
        }
    }

    function handleResponseCB(req, res, execState, err, results) {
        compress(req, res);   // TODO replace with a middleware
        var cb = req.param('callback');
        if (err) {
            var status = err.status || 400;
            res.writeHead(status, {
                'content-type' : 'application/json'
            });
            if (cb) {
                res.write(cb + '(');
            }
            res.write(JSON.stringify(err));
            if (cb) {
                res.write(cb + ')');
            }
            res.end();
        }
        else {
            var contentType = results.headers['content-type'];
            var h = {
                'Connection': serving ? 'keep-alive' : 'close',
                'Transfer-Encoding' : 'chunked'
            };
            _.each(results.headers, function(value, name) {
                h[name] = value;
            });
            h['content-type'] = cb ? 'application/javascript' : contentType;

            if(execState.length > 0) {
                h['Link'] = headers.format('Link', {
                    href : 'data:application/json,' + encodeURIComponent(JSON.stringify(execState)),
                    rel : ['execstate']
                });
            }
            res.writeHead(200, h);
            if (cb) {
                res.write(cb + '(');
            }
            if(results.body) {
                if (contentType === 'application/json') {
                    res.write(JSON.stringify(results.body));
                }
                else {
                    res.write(results.body);
                }
            }
            if (cb) {
                res.write(')');
            }
            res.end();
        }
        // If we get a 'close' event, end on all pending connections.
        if(!serving) {
            req.connection.end();
        }
    }

    // The caller gets the app and the engine/event emitter
    if(cb) {
        cb(app, engine);
    }
};
