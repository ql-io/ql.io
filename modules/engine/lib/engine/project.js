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
    _ = require('underscore');

exports.run = run;

// Filter JSON objects
function run(resultSet, statement, results, context, cb) {
    var obj, alias, cols, part, col;

    // Find the row-equivalent from the representation
    obj = select(resultSet, results);
    if(!statement.columns || statement.columns.name === '*' || statement.type === 'insert' ||
        (_.isArray(obj) && obj.length === 0) || // Skip these cases - there is nothing to project
        !obj) {
        // Can't filter non-array results
        return cb(obj);
    }
    else {
        alias = statement.fromClause[0].alias;
        // Strip aliases from column names
        if(alias) {
            cols = []
            if(_.isArray(statement.columns)) {
                _.each(statement.columns, function(column) {
                    // Trim the name, but keep the column alias.
                    col = {
                        name: column.name.substr(alias.length + 1)
                    }
                    if(column.alias) {
                        col.alias = column.alias;
                    }
                    cols.push(col);
                })
            }
            else {
                // Trim the name, but keep the column alias.
                col = {
                    name: statement.columns.name.substr(alias.length + 1)
                }
                if(statement.columns.alias) {
                    col.alias = statement.columns.alias;
                }
                cols.push(col);
            }
        }
        else {
            cols = statement.columns;
        }
        obj.__proto__ = context;
        part = jsonfill.project(cols, obj, context);
        return cb(part);
    }
}

function select(path, obj) {
    var splits = !path ? [] : path.split('.');
    var curr = obj;
    for(var i = 0; i < splits.length; i++) {
        if(curr.hasOwnProperty(splits[i])) {
            curr = curr[splits[i]];
            if(i < splits.length - 1 && _.isArray(curr) && curr.length > 0) {
                curr = curr[0];
            }
        }
        else {
            return [];
        }
    }
    return curr;
}

