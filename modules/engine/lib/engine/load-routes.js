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

var compiler = require('ql.io-compiler'),
    fs = require('fs'),
    url = require('url'),
    assert = require('assert'),
    _ = require('underscore');

// TODO: Watch for file changes
exports.load = function (opts) {
    var rootdir = opts.routes;
    var logEmitter = opts.logEmitter;

    if (!rootdir) {
        return {};
    }

    var routes = {simpleMap:{}};
    loadInternal(rootdir, '', logEmitter, routes);
    return routes;

};

function loadInternal(path, prefix, logEmitter, routes) {
    assert.ok(path, 'path should not be null');
    assert.ok(routes, 'routes should not be null');

    var script, stats, paths;
    path = path.charAt(path.length - 1) == '/' ? path : path + '/';
    try {
        paths = fs.readdirSync(path);
    }
    catch(e) {
        logEmitter.emitError('Unable to load routes from ' + path);
        return;
    }

    paths.forEach(function(filename) {
        stats = fs.statSync(path + filename);
        if (stats.isDirectory()) {
            loadInternal(path + filename,
                prefix.length > 0 ? prefix + '.' + filename : filename,
                logEmitter, routes);
        }
        else if (stats.isFile() && /\.ql/.test(filename)) {
            var cooked = null,
                typeReturn = null,
                pieces = null,
                tables = [],
                info = [];

            // Load route mapping files from the disk
            script = fs.readFileSync(path + filename, 'utf8');
            /*
             1. Check if script can be cooked
             2. Cooked Script contains 'return' statement
             3. 'return' statement contains 'route'
             4. 'route' can be parsed in to its pieces
             5. Pieces contain path
             */
            try {
                cooked = compiler.compile(script);
                tables = findTables(cooked);
                info = getRouteInfo(cooked);
            }
            catch(e) {
                logEmitter.emitWarning('Error loading route ' + (path + filename));
                logEmitter.emitWarning(e.stack || e);
                cooked = undefined;
            }
            if (cooked &&
                // get statement return
                (typeReturn = _.detect(cooked, function(statement) {
                    return statement.type == 'return'
                })) &&
                typeReturn.route && typeReturn.route.path && typeReturn.route.path.value &&
                (pieces = url.parse(typeReturn.route.path.value, true, false)) &&
                pieces.pathname
                ) {
                pieces.pathname = pieces.pathname.replace(/\{/g, ':').replace(/\}/g, ''); // replace {name} with :name
                _.each(pieces.query, function(v, k) { // replace {name} in query with name
                    if (/\{.*\}/.test(v)) {
                        pieces.query[k] = v.replace(/\{/g, '').replace(/\}/g, '');
                    } else {
                        logEmitter.emitError('Invalid query string, {} missing in script for query param value: '
                            + script);
                        delete pieces.query[k];
                    }
                });
                // get the http verb .. default 'get'
                typeReturn.route.method = typeReturn.route.method || 'get';
                typeReturn.route.method = typeReturn.route.method == 'delete' ? 'del' : typeReturn.route.method;

                // Get record for given route
                routes[pieces.pathname] = routes[pieces.pathname] || {};
                // Get record for http verb in the route record
                routes[pieces.pathname][typeReturn.route.method] = routes[pieces.pathname][typeReturn.route.method]
                    || [];
                // Add info for the current route
                if (!_.detect(routes[pieces.pathname][typeReturn.route.method], function(record) {
                    return _.isEqual(record.query, pieces.query);
                })) {
                    var routeRecord = {
                            script: cooked,
                            query: pieces.query,
                            routeInfo: typeReturn.route,
                            tables: tables,
                            info: info
                        };
                    routes[pieces.pathname][typeReturn.route.method].push(routeRecord);
                    routes.simpleMap[typeReturn.route.method + ':' + typeReturn.route.path.value]=routeRecord;
                } else {
                    logEmitter.emitError("Route already defined: " + script);
                }
            }
        }
        else {
            logEmitter.emitError("Script doesn't contain route information: " + script);
        }
    });
}

// all comment lines prior to Return statement
function getRouteInfo(cooked){
    var info = [];
    _.each(cooked, function(line, index){
        if(line.type === 'return'){
            for(var i = index -1; i > -1; i--){
                if(cooked[i].type === 'comment'){
                    info.unshift(cooked[i].text);
                }
            }
        }
    });
    return info;
}

function findTables(cooked){
    return walk(cooked, []);
}

function walk(obj, tables){
    if(_.isArray(obj)){
        tables = walkArray(obj, tables);
    }
    else if (!_.isString(obj) && !_.isNumber(obj)){
        tables  = walkObj(obj, tables);
    }
    return tables;
}

function walkObj(obj, tables){
    _.each(obj, function(value, name){
        if (name === 'fromClause') {
           tables =  _.union(tables,_.filter(_.pluck(value,'name'), function(entry) {
                return entry && !(entry.indexOf("{") === 0);
            }));
        }
        else {
            tables = walk(value, tables);
        }
    });
    return tables;
}

function walkArray(arr, tables){
   _.each(arr, function(ele){
       tables = walk(ele,tables);
   });
    return tables;
}