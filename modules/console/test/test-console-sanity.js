var http = require('http');

var Console = require('../app.js');
var c = new Console({
    tables: __dirname + '/tables',
    routes: __dirname + '/routes/',
    'enable console': false,
    connection: 'close'
});

var app = c.app;

module.exports = {
    'sanity': function(test) {
        app.listen(3000, function() {
            var options = {
                host: 'localhost',
                port: 3000,
                path: '/q?s=show%20tables',
                method: 'GET',
                headers: {
                    host: 'localhost',
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
                    var tables = JSON.parse(data);
                    test.ok(tables.length > 0);
                    app.close();
                    test.done();
                });
            });
            req.end();
        });
    }
}