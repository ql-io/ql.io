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

var jsonfill = require('./jsonfill.js'),
    _ = require('underscore'),
    assert = require('assert');

exports.exec = function(opts, statement, parentEvent, cb) {
    function getVarVal(varname) {
        if(varname.indexOf("{") === 0 && varname.indexOf("}") === varname.length - 1) {
            return varname.substring(1, varname.length - 1);
        }
        else return varname;
    }
    assert.ok(opts.tables, 'Argument tables can not be undefined');
    assert.ok(statement, 'Argument statement can not be undefined');
    assert.ok(statement, 'Argument cb can not be undefined');

    var tables = opts.tables, context = opts.context,
        request = opts.request, emitter = opts.emitter,
        insertTx, table, values, name, resource;



    // Get the dest
    name = statement.source.name;

    // Lookup context for the source - we do this since the compiler puts the name in
    // braces to denote the source as a variable and not a table.
    name = getVarVal(name);
    insertTx = opts.logEmitter.beginEvent({
        parent: parentEvent,
        type: 'insert',
        message: {
            line: statement.line
        },
        cb: cb});

    resource = context[name];
    values = {};

    if(context.hasOwnProperty(name)) { // The value may be null/undefined, and hence the check the property
        resource = jsonfill.unwrap(resource);
        _.each(statement.values, function(value, i) {
            values[statement.columns[i].name] = jsonfill.lookup(value, context);
        });
        if (statement.jsonObj){
            var jsonObj = getVarVal(statement.jsonObj.value);
            values = context[jsonObj];
        }

        _.each(values, function(val, key) {
            resource[key] = val;
        });
        context[statement.assign] = resource;
        opts.emitter.emit(statement.assign, resource);
        return insertTx.cb(undefined, resource);
    }
    else {
        // Get the resource
        table = opts.tempResources[name] || tables[name];
        if(!table) {
            return insertTx.cb('No such table ' + name);
        }
        var verb = table.verb('insert');
        if(!verb) {
            return insertTx.cb('Table ' + statement.source.name + ' does not support insert');
        }
        if (statement.jsonObj){
            var jsonObj = getVarVal(statement.jsonObj.value);
            values = context[jsonObj];
        }
        else {// not directly inserting json
            if(statement.columns){
                _.each(statement.values, function(value, i) {
                    values[statement.columns[i].name] = jsonfill.lookup(value, context);
                });
            }
            else {
                //assert.ok(statement.values.length > 0, 'statement value should have only one item for opaque param.');
                if (statement.values){
                    // user specified values in console
                    verb.connector.opaque = statement.values;
                }
                else{
                    //default opaque value is at req.body
                    verb.connector.opaque = context;
                }
            }
        }
        verb.exec({
            name: name,
            context: opts.context,
            config: opts.config,
            settings: opts.settings,
            resource: verb.connector,
            xformers: opts.xformers,
            serializers: opts.serializers,
            params: values,
            parts: opts.request.parts,
            request: request,
            statement: statement,
            emitter: emitter,
            logEmitter: opts.logEmitter,
            parentEvent: insertTx.event,
            callback: function(err, result) {
                if(result) {
                    context[statement.assign] = result.body;
                    opts.emitter.emit(statement.assign, result.body);
                }
                return insertTx.cb(err, result);
            }
        });
    }
};
