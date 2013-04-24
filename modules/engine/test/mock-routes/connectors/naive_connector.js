/*
example of using pipeline.
On top of library when (https://github.com/cujojs/when.git)
description of pipeline: https://github.com/cujojs/when/blob/master/docs/api.md

Things must have:
 customConnector.connectorName. this field tells the connector loader
 .exec that verb.js would like to call when there is an execution for any connectors.
 */
var pipeline = require('/Users/hochang/workspace/ql.io-mp-apis/node_modules/when/pipeline')
var customConnector = module.exports = function(table, statement, type, bag, path){
    var foo = function(n){
        return n+1
    }
    var bar = function(n){
        return n+2
    }
    var wae = function(n){
        return n*3
    }
    var beforePipeline = [foo]
    var afterPipeline = [foo, bar,wae]
    this.exec = function(args) {
        var mypromise = pipeline(beforePipeline, 1);
        mypromise.then(function(arg){
            results = send(arg)
            var myresult = pipeline(afterPipeline, results)
            myresult.then(function(resultbody){
                var result = {
                    headers: {
                        'content-type':  'application/json'
                    },
                    body: resultbody
                };
                return args.callback(null, result);
            })
        })

    }


function send(arg){
    return arg+1
}

}
customConnector.connectorName = 'aaa'
