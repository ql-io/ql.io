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

var winston = require('winston'),
    express = require('express'),
    browserify = require('browserify'),
    headers = require('headers'),
    fs = require('fs'),
    sanitize = require('validator').sanitize,
    connect = require('connect'),
    expat = require('xml2json'),
    assetManager = require('connect-assetmanager'),
    assetHandler = require('connect-assetmanager-handlers'),
    Engine = require('ql.io-engine'),
    MutableURI = require('ql.io-mutable-uri'),
    _ = require('underscore'),
    zlib = require('zlib'),
    WebSocketServer = require('websocket').server;

exports.version = require('./package.json').version;

process.on('uncaughtException', function(error) {
    winston.error(error.stack);
});

var skipHeaders = ['connection', 'host', 'referer', 'content-length', 'accept', 'accept-charset',
    'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
    'transfer-encoding', 'upgrade'];

var compressMethods = {
    'gzip' : zlib.createGzip,
    'deflate' : zlib.createDeflate,
    '*' : zlib.createGzip
};

// Default behaviour for cpuBusy.
// config.load parameter can specify well-defined behaviour to override.
var cpuBusy = function() {
    return false;
};

var Console = module.exports = function(config, cb) {

    config = config || {};

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

    var logger = logdir ? new (winston.Logger)({
        transports: [
            new (winston.transports.File)({
                filename: process.cwd() + '/logs/ql.io.log',
                maxsize: 1024000 * 5
            })
        ]
    }) : new (winston.Logger)();

    logger.setLevels(config['log levels'] || winston.config.cli.levels);
    config.logger = config.logger || logger;
    var engine = new Engine(config);

    if(config.tables) {
        logger.info('Loading tables from ' + config.tables);
    }
    if(config.routes) {
        logger.info('Loading routes from ' + config.routes);
    }
    if(config.config) {
        logger.info('Loading config from ' + config.config);
    }
    if(config.load) {
         cpuBusy = config.load;
    }

    var app = this.app = express.createServer();

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

    var bodyParser = connect.bodyParser();
    app.use(bodyParser); // parses the body for application/x-www-form-urlencoded and application/json
    var respHeaders = require(__dirname + '/lib/middleware/respheaders');
    app.use(respHeaders());
    if(config['enable console']) {
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
                    'routestables.css'
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
            engine.emit(Engine.Events.EVENT, {}, new Date() + ' Adding route ' + uri + ' for ' + verb);
            app[verb](uri, function(req, res) {
                var holder = {
                    params: {},
                    headers: {},
                    routeParams: {},
                    connection: {
                        remoteAddress: req.connection.remoteAddress
                    }
                };

                // get all query params
                collectHttpQueryParams(req, holder, false);

                // find a route (i.e. associated cooked script)
                var route = _(verbRouteVariants).chain()
                    .filter(function (verbRouteVariant) {
                        return _.isEqual(_.intersection(_.keys(holder.params), _.keys(verbRouteVariant.query)),
                            _.keys(verbRouteVariant.query))
                    })
                    .reduce(function (match, route) {
                        return match == null ?
                            route : _.keys(route.query).length > _.keys(match.query).length ? route : match;
                    }, null)
                    .value();

                if (!route) {
                    res.writeHead(400, 'Bad input', {
                        'content-type' : 'application/json'
                    });
                    res.write(JSON.stringify({'err' : 'No matching route'}));
                    res.end();
                    return;
                }

                // collect the path params
                var keys = _.keys(req.params);
                _.each(keys, function(key) {
                    holder.routeParams[key] = req.params[key];
                });

                _.each(route.query, function(queryParam, paramName) {
                    holder.routeParams[queryParam] = holder.params[paramName].toString();
                });

                // collect headers
                collectHttpHeaders(req, holder);
                holder.connection = {
                    remoteAddress: req.connection.remoteAddress
                }

                var execState = [];
                engine.execute(route.script,
                    {
                        request: holder,
                        route: uri,
                        context: req.body || {}
                    },
                    function(emitter) {
                        setupExecStateEmitter(emitter, execState, req.param('events'));
                        setupCounters(emitter);
                        emitter.on('end', function(err, results) {
                            return handleResponseCB(req, res, execState, err, results);
                        });
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
            res.render(__dirname + '/public/views/routes-tables/tables.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/routes-table-layout',
                tables: results
            });
        }

        var execState = [];
        engine.execute('show tables',
            {
                request: holder
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                setupCounters(emitter);
                emitter.on('end', function(err, results) {
                    return isJson || err ?
                        handleResponseCB(req, res, execState, err, results) :
                        routePage(res,execState,results.body);
                });
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
            res.render(__dirname + '/public/views/routes-tables/tableInfo.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/routes-table-layout',
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

        var execState = [];
        engine.execute('describe' + decodeURIComponent(name),
            {
                request: holder
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                setupCounters(emitter);
                emitter.on('end', function(err, result) {
                    return isJson || err ?
                        handleResponseCB(req, res, execState, err, result):
                        routePage(res,execState,result.body);
                });
            }
        );
    });

    // HTTP indirection for 'show routes' command
    app.get('/routes', function(req,res){
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
            res.render(__dirname + '/public/views/routes-tables/routes.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/routes-table-layout',
                routes: results
            });
        }

        var execState = [];
        engine.execute('show routes',
            {
                request: holder
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                setupCounters(emitter);
                emitter.on('end', function(err, results) {
                    return isJson || err ?
                        handleResponseCB(req, res, execState, err, results) :
                        routePage(res,execState,results.body);
                });
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
            res.render(__dirname + '/public/views/routes-tables/routeInfo.ejs', {
                title: 'ql.io',
                layout: __dirname + '/public/views/routes-table-layout',
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

        var execState = [];
        engine.execute('describe route "' + decodeURIComponent(path) + '" using method ' + method,
            {
                request: holder
            },
            function(emitter) {
                setupExecStateEmitter(emitter, execState, req.param('events'));
                setupCounters(emitter);
                emitter.on('end', function(err, result) {
                    return isJson || err ?
                        handleResponseCB(req, res, execState, err, result) :
                        routePage(res,execState,result.body);
                });
            }
        );
    });

    /*
     * '/q' is disabled only if the console is created with config, 'enable q' : false.
     */
    var enableQ = config['enable q'] === undefined ? true : config['enable q'];

    if(enableQ) {
        app.get('/q', function(req, res) {
            var holder = {
                params: {},
                headers: {} ,
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
            var execState = [];
            engine.execute(query,
                {
                    request: holder
                }, function(emitter) {
                    setupExecStateEmitter(emitter, execState, req.param('events'));
                    setupCounters(emitter);
                    emitter.on('end', function(err, results) {
                        return handleResponseCB(req, res, execState, err, results);
                    })
                })
            }
        );
    }

    // 404 Handling
    app.use(function(req, res, next) {
        var msg = 'Cannot GET ' + sanitize(req.url).xss();
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
                process.send({event:  Engine.Events.SCRIPT_ACK, pid: process.pid});
            })
            emitter.on(Engine.Events.STATEMENT_REQUEST, function(packet) {
                process.send({event:  Engine.Events.STATEMENT_REQUEST, pid: process.pid});
            })
            emitter.on(Engine.Events.STATEMENT_RESPONSE, function(packet) {
                process.send({event:  Engine.Events.STATEMENT_RESPONSE, pid: process.pid});
            })
            emitter.on(Engine.Events.SCRIPT_DONE, function(packet) {
                process.send({event:  Engine.Events.SCRIPT_DONE, pid: process.pid});
            })
        }
    }

    function encode(res, acceptEncoding, h) {
        var write = res.write;
        var end = res.end;
        var method, stream;
        // TODO right options for the compression
        var options = {};
        // Default to gzip.
        if('*' === acceptEncoding.trim()) {
            method = 'gzip';
        }
        if(!method) {
            // find the accept method quick, considering
            // typical accept-encoding values.
            var encodings = headers.parse('accept-encoding', acceptEncoding);
            for(var i = 0, len = encodings.length; i < len ; ++i) {
                if(!encodings[i].params.q) {
                    // q factor of 1
                    method = encodings[i].encoding;
                    break;
                }
                if(encodings[i].params.q === '0') {
                    delete encodings[i];
                }
            }
            if(!method) {
                encodings = _.without(encodings, 'undefined'); // Removed deleted elements (q=0)
                if(encodings.length > 0) {
                    var ordered = _.sortBy(encodings, function(enc) {
                        return -enc.params.q;
                    });
                    for(var i = 0, len = ordered.length; i < len ; ++i) {
                        if(_.has(compressMethods, ordered[i].encoding)) {
                            method = ordered[i].encoding;
                            break;
                        }
                    }
                }
            }
        }
        if(method) {
            // http://www.subbu.org/blog/2007/12/vary-header-for-restful-applications
            h['vary'] = 'accept-encoding';

            stream = compressMethods[method](options);
            h['content-encoding'] =  method === '*'? 'gzip' : method;
            // Proxy for res.write and res.end
            res.write = function (chunk, enc) {
                return stream ? stream.write(chunk, enc) : write.call(res, chunk, enc);
            };

            res.end = function (chunk, enc) {
                if (chunk) {
                    this.write(chunk, enc);
                }
                return stream ? stream.end() : end.call(res);
            };

            stream.on('data', function(chunk) {
                write.call(res, chunk);
            })

            stream.on('end', function() {
                end.call(res);
            });
        }
        //
        // else {
        //     res.writeHead(406)....
        // }
        //
        // Instead of sending 406, if not capable of generating response
        // entities which have content characteristics not acceptable according
        // to the accept headers sent in the request, send 'identity'.
        //
    }

    function handleResponseCB(req, res, execState, err, results) {
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
            //
            // Hack: This is a hack to fix expressjs. The way expressjs is written forbids calling
            // writeHead. We need to look more closely into this.
            //
            res._header = undefined;
            var contentType = results.headers['content-type'];
            var h = {
                'Connection': 'keep-alive',
                'Transfer-Encoding' : 'chunked',
                'content-type' : cb ? 'application/javascript' : contentType,
                'Request-Id' : results.headers['request-id']
            };

            if(!cpuBusy()) {
                var acceptEncoding = req.headers['accept-encoding'];
                if(acceptEncoding && acceptEncoding.trim() !== '') {
                    encode(res, acceptEncoding, h);
                }
            }

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
            if (contentType === 'application/json') {
                res.write(JSON.stringify(results.body));
            }
            else {
                res.write(results.body);
            }
            if (cb) {
                res.write(')');
            }
            res.end();
        }
    }

    // The caller gets the app and the engine/event emitter
    if(cb) {
        cb(app, engine);
    }
};
