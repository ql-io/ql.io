var _ = require('underscore'),
    util = require('util'),
    Engine = require('../lib/engine');

var engine = new Engine({
    tables : __dirname + '/mock-routes/tables',
    routes : __dirname + '/mock-routes/routes',
    config : __dirname + '/config/dev.json',
    connectors : __dirname + '/mock-routes/connectors'
});
module.exports['simple pipeline'] = function (test) {
        var q = 'select * from custom';
        engine.exec(q, function(err, results) {

            if (err) {
                test.fail('got error: ' + err.stack);
            }
            else {
                test.equals(results.body, 18)
                test.done();
            }
        })
    }

var cooked = {
    simplepipeline:{
        ports: [],
        script: 'select * from custom',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                }
                else {
                    test.ok(result.body);
                    test.equal(result.body,18);
                }
            }
        }
    },
    asyncpipeline : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:JSON.stringify(
                    3
                )
            }
        ],
        script: 'select * from custom.async',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    console.log(err.stack || err);
                }
                else {
                    test.ok(result.body);
                    test.equal(result.body,15);
                }
            }
        }
    }
}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine: engine
});