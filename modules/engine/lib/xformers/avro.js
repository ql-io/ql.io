'use strict';

var fs = require('fs'),
    avro = require('avro'),
    assert = require('assert'),
    http = require('http'), 
    https = require('https'),
    URI = require('uri');

var SCHEMA_DIR = 'schemas';

exports.toJson = function(data, respCb, errorCb, headers) {
    var schema_uri = headers["x-xc-schema-uri"];
    var topic = headers["x-xb-topic"];
    var schema_version = headers["x-xc-schema-version"];
    var schema, isTls, uri, heirpart, authority, host, port, path, options, client;
    var clientRequest;
    var schema_file;

    try {
	if(!topic) {
	    throw 'Topic header not set.';
	}
	if(!schema_version) {
	    throw 'Schema version header not set.';
	}
	if(!schema_uri) {
	    throw 'Schema URI header not set.';
	}

	try {
            schema = JSON.parse(fs.readFileSync(schema_file, 'utf8'));
	} catch (e) {
	    schema = null;
	}

	schema_file = SCHEMA_DIR + '/' + topic.replace(/\//g, '-');

	if(schema == null
	   || schema_version !== schema.version) {

	    isTls = schema_uri.indexOf('https://') == 0;

	    uri = new URI(schema_uri, false);

	    heirpart = uri.heirpart();
	    assert.ok(heirpart, 'URI [' + schema_uri + '] is invalid');
	    authority = heirpart.authority();
	    assert.ok(authority, 'URI [' + schema_uri + '] is invalid');
	    host = authority.host();
	    assert.ok(host, 'Host of URI [' + schema_uri + '] is invalid');
	    port = authority.port() || (isTls ? 443 : 80);
	    assert.ok(port, 'Port of URI [' + schema_uri + '] is invalid');
	    path = (heirpart.path().value || '') + (uri.querystring() || '');
	    options = {
		host: host,
		port: port,
		path: path,
		method: 'GET'
	    };

	    client = isTls ? https : http;

	    clientRequest = client.request(options, function(res) {
		var respData = '';
		res.on('data', function (chunk) {
		    respData += chunk;
		});
		res.on('end', function() {
		    try {
			fs.statSync(SCHEMA_DIR);
		    } catch(e) {
			fs.mkdirSync(SCHEMA_DIR, '0700');
		    }
		    fs.writeFileSync(schema_file, respData);
		    return respCb(avro.decode(JSON.parse(respData), data));
		});
	    });

	    clientRequest.on('error', function(err) {
		return errorCb(err);
	    });

	    clientRequest.end();
        } else {
            return respCb(avro.decode(schema, data));
	}
    }
    catch(error) {
        return errorCb(error);
    }
}