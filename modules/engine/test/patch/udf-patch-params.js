exports['udf'] = function () {
    return {
        'testValue': function (a) {
            if(a == 'test') {
                return 'TESTVALUE'
            }
            else {
                return 'OTHERVALUE'
            }
        }
    };
};

var uriTemplate = require('ql.io-uri-template');


exports['patch headers'] = function (options) {
    var h = options.headers;
    var uri = uriTemplate.parse(options.statement.uri).format(options.params);
    h['x-uri'] = uri;
    return h;
};