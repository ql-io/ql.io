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

var http = require('http'),
    winston = require('winston'),
    express = require('express'),
    browserify = require('browserify'),
    headers = require('headers'),
    check = require('validator').check,
    sanitize = require('validator').sanitize,
    connect = require('connect'),
    expat = require('xml2json'),
    assetManager = require('connect-assetmanager'),
    assetHandler = require('connect-assetmanager-handlers'),
    EventEmitter = require('events').EventEmitter,
    Engine = require('ql.io-engine'),
    _ = require('underscore'),
    WebSocketServer = require('websocket').server;

process.on('uncaughtException', function(error) {
    winston.error(error.stack);
});

var skipHeaders = ['connection', 'host', 'referer', 'content-length', 'accept', 'accept-charset',
    'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
    'transfer-encoding', 'upgrade'];

var Console = module.exports = function(config, cb) {

    config = config || {};

    var engine = new Engine(config);
    var logger = new (winston.Logger)({
        transports: [
            new (winston.transports.File)({
                filename: process.cwd() + '/logs/ql.io.log',
                maxsize: 1024000 * 5
            })
        ]
    });
    logger.setLevels(config['log levels'] || winston.config.syslog.levels);

    engine.setMaxListeners(25);
    engine.on(Engine.Events.EVENT, function(event, message) {
        if(message) {
            logger.info(new Date() + ' - ' + message);
        }
    });
    engine.on(Engine.Events.SCRIPT_DONE, function(event, message) {
        logger.info(new Date() + ' - ' + JSON.stringify(event));
    });
    engine.on(Engine.Events.ERROR, function(event, message) {
        if(message) {
            logger.error(new Date() + ' - ' + message.stack || message);
        }
    });
    engine.on(Engine.Events.WARNING, function(event, message) {
        if(message) {
            logger.warning(new Date() + ' - ' + message.stack || message);
        }
    });

    if(config.tables) {
        logger.info('Loading tables from ' + config.tables);
    }
    if(config.routes) {
        logger.info('Loading routes from ' + config.routes);
    }
    if(config.config) {
        logger.info('Loading config from ' + config.config);
    }

    var app = this.app = express.createServer();

    // Add parser for xml
    connect.bodyParser.parse['application/xml'] = function(req, options, next) {
        var buf = '';
        req.setEncoding('utf8');
        req.on('data', function (chunk) {
            buf += chunk
        });
        req.on('end', function () {
            try {
                req.body = expat.toJson(buf, {object: true});
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
                    'jquery-ui.css'
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
    var routes = engine.routes;
    _.each(routes, function(verbRoutes, uri) {
        if(uri != 'simpleMap'){
            _.each(verbRoutes, function(verbRouteVariants, verb) {
                engine.emit(Engine.Events.EVENT, {}, new Date() + ' Adding route ' + uri + ' for ' + verb);
                app[verb](uri, function(req, res) {
                    var holder = {
                        params: {},
                        headers: {},
                        routeParams: {}
                    };

                    // get all query params
                    collectHttpQueryParams(req, holder, false);

                    // find a route (i.e. associated cooked script)
                    var route = _.detect(verbRouteVariants, function(verbRouteVariant) {
                        return _.isEqual(_.intersection(_.keys(holder.params), _.keys(verbRouteVariant.query)),
                            _.keys(verbRouteVariant.query));
                    });

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
        }
    });

    app.get('/tables', function(req,res){
        var holder = {
            params: {fromRoute: true},
            headers: {}
        };
        var execState = [];
        engine.execute('show tables',
            {
                request: holder
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

    app.get('/table', function(req,res){
        var holder = {
            params: {fromRoute: true},
            headers: {}
        };

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
                emitter.on('end', function(err, results) {
                    return handleResponseCB(req, res, execState, err, results);
                });
            }
        );
    });

    app.get('/routes', function(req,res){
        var holder = {
            params: {},
            headers: {}
        };
        var execState = [];
        engine.execute('show routes',
            {
                request: holder
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

        var execState = [];
        engine.execute('describe route "' + decodeURIComponent(path) + '" using method ' + method,
            {
                request: holder
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

    app.get('/q', function(req, res) {
            var holder = {
                params: {},
                headers: {}
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

    // Also listen to WebSocket requests
    var emitter;
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
                engine.execute(script, {}, function(emitter) {
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
                                body: err
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
                'content-type' : cb ? 'application/javascript' : contentType,
                'Request-Id' : results.headers['request-id']
            };
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

    app = server;

    // The caller gets the app and the engine/event emitter
    if(cb) {
        cb(app, engine);
    }
};
