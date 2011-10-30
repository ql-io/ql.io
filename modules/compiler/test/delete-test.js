// Use expresso to run this

var compiler = require('lib/compiler');

exports['delete'] = function (test) {
    var q = "delete from foo where bar = 'a'";
    var statement = compiler.compile(q);
    var e = [{
        "type": "delete",
        "source": {
            "name": "foo"
        },
        "whereCriteria": {
            "operator": "=",
            "lhs": {name: "bar"},
            "rhs": {
                "value": "a"
            }
        },
        "line": 1,
        "id": 0
    }];
    test.deepEqual(statement, e);
    test.done();
};

exports['delete-csv'] = function (test) {
    var q = "delete from ebay.item where itemId in ('180652013910','120711247507')";
    var statement = compiler.compile(q);
    var e = [{
        type: 'delete',
        "source" :
            {name: 'ebay.item'},
        whereCriteria: {
            operator: 'in',
            lhs: {name: 'itemId'},
            "rhs":{
                value: ['180652013910', '120711247507']
            }
        },
        line: 1,
        id: 0
    }];
    var sys = require('sys');
    test.deepEqual(statement, e);
    test.done();
};
