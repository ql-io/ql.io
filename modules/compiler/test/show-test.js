// Use expresso to run this

var compiler = require('lib/compiler');

exports['show'] = function (test) {
    var q = "show tables";
    var statement = compiler.compile(q);
    var e = [{
        type: 'show',
        line: 1,
        id: 0
    }];
    test.deepEqual(statement, e);
    test.done();
};


exports['show assign'] = function (test) {
    var q = "tables = show tables; return {};";
    var statement = compiler.compile(q);
    var e = [
        {
            type: 'show',
            line: 1,
            assign: 'tables',
            id: 0,
            dependsOn: [],
            listeners: []
        },
        {
            rhs: {
                object: {},
                type: 'define',
                line: 1
            },
            line: 1,
            type: "return",
            id: 1,
            dependsOn: [],
            listeners: []
        }
    ];
    test.deepEqual(statement, e);
    test.done();
};
