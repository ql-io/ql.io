var _ = require('underscore');
var j = require('JSONPath');

this.a1 = [
    {"name": "Brand-A", "keys": [
        { "name": "G1"},
        {"name": "G2"},
        {"name": "G3"}
    ]},
    {"name": "Brand-B", "keys": [
        { "name": "G1"},
        {"name": "G2"}
    ]},
    {"name": "Brand-C", "keys": [
        { "name": "G4"},
        {"name": "G2"}
    ]}
];

this.a2 = [
    {"name": "Brand-A", "details": [
        {"name": "G3", "count": 32},
        {"name": "G5", "count": 18}
    ]},
    {"name": "Brand-C", "details": [
        {"name": "G3", "count": 32},
        {"name": "G5", "count": 18}
    ]}
];

this.keySet = [
    ["G1", "G2", "G3"],
    ["G1", "G2"],
    ["G4", "G2"]
];
this.rows = this.a2;

var foo = [
    [ 'Brand-A', [
        { name: 'G3', count: 32 },
        { name: 'G5', count: 18 }
    ] ],
    [ 'Brand-C', [
        { name: 'G3', count: 32 },
        { name: 'G5', count: 18 }
    ] ]
];

this.index = 0;
this.row = this.rows[this.index];

// Ideally this function should receive the column a1.keys
exports.f1 = function (keys) {
    var keys = this.keySet[this.index];
    var names = j.eval(this.row.details, '$..name');
    var found = false;
    for(var i = 0; i < names.length; i++) {
        if(keys.indexOf(names[i]) > -1) {
            found = true;
            break;
        }
    }
    console.log(found);
    return found;
}

exports.f2 = function (keys, details) {
    var names = j.eval(details, '$..name');
    var found = false;
    for(var i = 0; i < names.length; i++) {
        if(keys.indexOf(names[i]) > -1) {
            found = true;
            break;
        }
    }
    // if null, this row will be excluded from results
    return found ? this.row : null;
}

