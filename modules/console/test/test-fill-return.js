var http = require('http');

var Console = require('../app.js');

module.exports = {
    'fill-return-headers': function(test) {
        var c = new Console({
            routes: __dirname + '/fill-return/obj',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/fill-return',
                method: 'GET',
                headers: {
                    h1: 'v1',
                    h2: 'v2',
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                test.equals(res.statusCode, 200);
                test.equals(res.headers['content-type'], 'application/json');
                var data = '';
                res.on('data', function(chunk) {
                    data = data + chunk;
                })
                res.on('end', function() {
                    var resp = JSON.parse(data);
                    test.deepEqual(resp, {
                        'h1' : 'v1',
                        'h2' : 'v2'
                    })
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    },

    'fill-return-path-segments': function(test) {
        var c = new Console({
            routes: __dirname + '/fill-return/obj',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/fill-return/v1/v2',
                method: 'GET',
                headers: {
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                test.equals(res.statusCode, 200);
                test.equals(res.headers['content-type'], 'application/json');
                var data = '';
                res.on('data', function(chunk) {
                    data = data + chunk;
                })
                res.on('end', function() {
                    var resp = JSON.parse(data);
                    test.deepEqual(resp, {
                        'h1' : 'v1',
                        'h2' : 'v2'
                    })
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    },

    'fill-return-query-params': function(test) {
        var c = new Console({
            routes: __dirname + '/fill-return/obj',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/fill-returnp?p1=v1&p2=v2',
                method: 'GET',
                headers: {
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                res.setEncoding('utf8');
                test.equals(res.statusCode, 200);
                test.equals(res.headers['content-type'], 'application/json');
                var data = '';
                res.on('data', function(chunk) {
                    data = data + chunk;
                })
                res.on('end', function() {
                    var resp = JSON.parse(data);
                    test.deepEqual(resp, {
                        'h1' : 'v1',
                        'h2' : 'v2'
                    })
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    }
}