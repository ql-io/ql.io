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

var _ = require('underscore'),
    Verb = require('./verb.js'),
    markdown = require('markdown'),
    HttpConnector = require('./httpConnector.js'),
    mongo = require('mongodb');;

var Table = module.exports = function(opts, comments, statement) {
    this.statement = statement;
    this.name = statement.name;
    this.opts = opts;
    this.verbs = {};
    //this.connectorPath = opts.connectorPath;
    var bag = {
        config: opts.config,
        connectors: opts.connectors
    };

    // Metadata for describe
    this.meta = {
        name: this.statement.name,
        routes: []
    };
    var self = this;
    self.comments = '';
    if(comments && comments.length > 0) {
        _.each(comments, function(comment) {
            self.comments += markdown.markdown.toHTML(comment.text);
        });
    }
    var verbs = ['select', 'insert', 'update', 'delete'];
    for(var i = 0; i < verbs.length; i++) {
        var type = verbs[i];
        if(self.statement[type]) {
            try {
                var verb = new Verb(self.name, self.statement[type], type, bag, self.opts.path, statement.connector);
                self.verbs[type] = verb;
            }
            catch(e) {
                self.opts.logEmitter.emitError(e.message || e);
                return self.opts.cb(e);
            }
        }
    };
};

Table.prototype.verb = function(type) {
    return this.verbs[type];
};