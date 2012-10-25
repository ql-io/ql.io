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
var http = require('http'),
    querystring = require('querystring'),
    eventTypes = require('./event-types'),
    _ = require('underscore');
exports.getPic = function(compiled, emitter){
    var post_domain = 'yuml.me';
    var post_port = 80;
    var post_path = '/diagram/scruffy/class/';
    var diagramtxt = composeDiagram(compiled);
    if(!diagramtxt){
        return;
    }

    var post_data = querystring.stringify({dsl_text: diagramtxt});

    var post_options = {
        host: post_domain,
        port: post_port,
        path: post_path,
        method: 'POST',
        headers: {
            'content-length': post_data.length
        }
    };
    var visualurl = ['http://', post_domain, ':', post_port, post_path].join('');
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            emitter.emit(eventTypes.VISUALIZATION, visualurl.concat(chunk));
        });
    });

// write parameters to post body
    post_req.write(post_data);
    post_req.end();
}


function composeDiagram(forest){
    // scope involves reverse visit, keep track of visited statement to avoid infinite loop
    var visited = [],
        colors = ['red','yellow','blue','green','purple','brown'],
        colorIdx = 0;
    function getColor(){
        var color = ['{bg:', colors[colorIdx++],'}'].join('');
        if (colorIdx == colors.length){
            colorIdx = 0;
        }
        return color;
    }
    function getDepHelper(tree) {
        if(visited.indexOf(tree.id) != -1){
            return '';
        }
        visited.push(tree.id);
        var sofar = '', addition;

        if (tree.hasOwnProperty('rhs')) {
            sofar += getDepHelper(tree.rhs);
        }
        if (tree.hasOwnProperty('return')){
            sofar += getDepHelper(tree.return);
        }
        var line_num = tree.line ? tree.line : 'return';
        if (tree.hasOwnProperty('fallback')) {
            var fallback = tree.fallback;
            if (fallback.dependsOn && fallback.dependsOn.length > 0){
                addition = _.reduce(fallback.dependsOn, function(newgraph,fallbackDepend){
                    var tmp = '['+line_num+']->[note:'+fallbackDepend.line+'],';
                    newgraph = newgraph.concat(tmp);
                    return newgraph.concat(getDepHelper(fallbackDepend));
                },'');
                sofar = sofar.concat(addition);
                /*for (var j = 0; j < fallback.dependsOn.length; j++) {
                    addition = '['+line_num+']->[note:'+fallback.dependsOn[j].line+'],';
                    sofar += addition;
                    sofar += getDepHelper(fallback.dependsOn[j]);
                } */
            }
        }
        if (tree.type != 'try' && tree.dependsOn && tree.dependsOn.length > 0) {
            for (var j = 0; j < tree.dependsOn.length; j++) {
                var dep = tree.dependsOn[j];
                addition = '['+line_num+']->['+dep.line+'],'
                sofar += addition;
                sofar += getDepHelper(dep);
            }
        }
        if(tree.scope){
            sofar += getDepHelper(tree.scope);
        }
        //special scope relationships
        if(tree.type === 'if'){
            var mycolor = getColor();
            _.each(tree.if, function(ifline){
                addition = ['[', ifline.line, mycolor, ']-if>[', line_num, mycolor, '],'].join('');
                sofar += addition;
                sofar += getDepHelper(ifline);
            })
            _.each(tree.else, function(elseline){
                addition = ['[', elseline.line, mycolor, ']-else>[', line_num, mycolor, '],'].join('');
                sofar += addition;
                sofar += getDepHelper(elseline);
            })
        }else if(tree.type === 'try'){
            var mycolor = getColor();
            _.each(tree.dependsOn, function(tryline){
                addition = ['[',tryline.line, mycolor, ']-try>[',line_num, mycolor, '],'].join('');
                sofar += addition;
                sofar += getDepHelper(tryline);
            })
            _.each(tree.catchClause, function(mycatch){
                var cond = mycatch.condition;
                addition = ['[', cond.line, mycolor, ']-catch_cond>[', line_num, mycolor, '],'].join('');
                sofar += addition;
                sofar += getDepHelper(cond);
                _.each(mycatch.lines, function(catchline){
                    addition = ['[',catchline.line, mycolor, ']-catch>[', cond.line, mycolor, '],'].join('');
                    sofar += addition;
                    sofar += getDepHelper(catchline);
                })
            })

            _.each(tree.finally, function(finallyline){
                addition = ['[',finallyline.line, mycolor, ']-finally>[', line_num, mycolor, '],'].join('');
                sofar += addition;
                sofar += getDepHelper(finallyline);
            })
        }

        return sofar;
    }
    if (!forest){
        return '';
    }
    else {
        //var diagramtxt = _.reduce(forest, function(tree, deptxt){
        var diagramtxt = getDepHelper(forest);
        //}, '');
        return diagramtxt;
    }

}