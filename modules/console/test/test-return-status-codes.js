"use strict";

var http = require('http'),
    Console = require('../app.js'),
    headers = require('headers');

module.exports = {
    'gateway-error-status':function (test) {
        var c = new Console({
            tables: __dirname + '/tables',
            routes: __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console': false,
            connection: 'close'
        });

        var app = c.app;
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: "/q?s=select%20*%20from%20invalid.table",
                method: 'GET',
                headers: {
                    host: 'localhost',
                    connection: 'close'
                }
            };
            var req = http.request(options, function(res) {
                test.ok(res.statusCode === 502);
                app.close();
                test.done();
            });

            req.on('error', function(err) {
                console.log(err);
                test.ok(false);
                app.close();
                test.done();

            });
            req.end();
        });
    }
}