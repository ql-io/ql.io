"use strict";

var avroXFormer = require('../lib/xformers/avro');
var avro = require('avro'), util = require('util'), http = require('http'), fs = require('fs');

// NOT testing Avro decoding ... just the transformer wrapper

var server = http.createServer(function (req, res) {
    var file = __dirname + '/schemas' + req.url;
    var stat = fs.statSync(file);
    console.log(file);

    res.writeHead(200, {
        'Content-Type':file.indexOf('.xml') >= 0 ? 'application/xml' : 'application/json',
        'Content-Length':stat.size
    });
    var readStream = fs.createReadStream(file);
    util.pump(readStream, res, function (e) {
        if (e) {
            console.log(e.stack || e);
        }
        res.end();
    });
});

server.listen(3111);

exports['Missing headers'] = function(test) {
    avroXFormer.toJson(null,
		       function(results) {
			   test.fail("Expected error.");
			   test.done();
		       },
		       function(error) {
			   test.equal(error, "Topic header not set.");
			   test.done()
		       },
		       {});
};


exports['Basic success'] = function(test) {
    var schema_text = fs.readFileSync('schemas/schema/1.0.0');

    var schema = JSON.parse(schema_text);

    var data = {"result": "some data"};

    var encoded = avro.encode(schema, data);
    var headers = {
	'x-xc-schema-version' : '1.0.0',
	'x-xc-schema-uri' : 'http://localhost:3111/schema/1.0.0',
	'x-xb-topic' : '/topic'
    };

    avroXFormer.toJson(encoded,
		       function(results) {
			   test.deepEqual(results, data);
			   test.done();
		       },
		       function(error) {
			   test.fail("Error", error);
			   test.done();
		       },
		       headers);
};

exports['New version'] = function(test) {
    var schema_text = fs.readFileSync('schemas/schema/1.0.1');

    var schema = JSON.parse(schema_text);

    var data = {"result": "some data", "new": "more data"};

    var encoded = avro.encode(schema, data);
    var headers = {
	'x-xc-schema-version' : '1.0.1',
	'x-xc-schema-uri' : 'http://localhost:3111/schema/1.0.1',
	'x-xb-topic' : '/topic'
    };

    avroXFormer.toJson(encoded,
		       function(results) {
			   test.deepEqual(results, data);
			   test.done();
		       },
		       function(error) {
			   test.fail("Error", error);
			   test.done();
		       },
		       headers);
};
