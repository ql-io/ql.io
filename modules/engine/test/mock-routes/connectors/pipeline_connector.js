/*
 example of using pipeline to make async calls..
 On top of library when (https://github.com/cujojs/when.git)
 description of pipeline: https://github.com/cujojs/when/blob/master/docs/api.md

 put all chained functions into arrays. In my example, beforePipeline and afterPipeline
 Calling pipeline to executed tasks in sequence, but without overlap. Result from prior task will be passed as argument to the latter tasks.
 The final result can be accessed in the function passed in promise.then.



 */
var pipeline = require('/Users/hochang/workspace/ql.io-mp-apis/node_modules/when/pipeline'),
    when = require('/Users/hochang/workspace/ql.io-mp-apis/node_modules/when'),
    http = require('http');
var customConnector = module.exports = function(){
    var foo = function(n){
        foo1(function(err, results){

        })
    }
    /*
    This is an aysnc call. In order to put it into pipeline,
    a defer() is required to keep the call blocking during I/O
     */
    var foo = function(){
        var deferred = when.defer()
        var options = {
            host: 'localhost',
            port: 3000
        }

        callback = function(response) {
            var str = '';

            //another chunk of data has been recieved, so append it to `str`
            response.on('data', function (chunk) {
                str += chunk;
            });

            //the whole response has been recieved, so we just print it out here
            response.on('end', function () {
                deferred.resolve(parseInt(str))
            });
        }

        http.request(options, callback).end();
        return deferred.promise
    }
    var bar = function(n){
        return n+2
    }
    var wae = function(n){
        return n*3
    }


    this.exec = function(args) {
        var cb = function(n){
            var asd=args
            var result = {
                headers: {
                    'content-type':  'application/json'
                },
                body: n
            };
            return args.callback(null, result);
        }
        var afterPipeline = [foo, bar,wae,cb]
        pipeline(afterPipeline, 1);


    function send(arg){
        return arg+1
    }


}
}
customConnector.connectorName = 'bbb'
