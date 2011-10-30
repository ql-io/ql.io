var compiler = require('lib/compiler');

exports['describe'] = function (test) {
    var q = "describe foo";
    var statement = compiler.compile(q);
    var e = [{
        type: 'describe',
        line: 1,
        source: {'name': 'foo' },
        id: 0
    }];
    test.deepEqual(statement, e);
    test.done();
};

exports['desc'] = function (test) {
    var q = "desc foo";
    var statement = compiler.compile(q);
    var e = [{
        type: 'describe',
        line: 1,
        source: {'name': 'foo' },
        id: 0
    }];
    test.deepEqual(statement, e);
    test.done();
};

exports['describe-no-table'] = function(test) {
    var q = "describe ";
    try {
        compiler.compile(q);
        test.fail('table name is missing');
        test.done();
    }
    catch(e) {
        test.ok(true);
        test.done();
    }
};

exports['describe-assign'] = function (test) {
    var q = "des = describe foo; return {};";
    var statement = compiler.compile(q);
    var e = [
        {
            type: 'describe',
            line: 1,
            source: {'name': 'foo' },
            assign: 'des',
            id: 0,
            dependsOn: [],
            listeners: []
        },
        {
            type: 'return',
            line: 1,
            rhs: { object: {}, type: 'define', line: 1 },
            id: 1,
            dependsOn: [],
            listeners: []
        }
    ];
    test.deepEqual(statement, e);
    test.done();
};


