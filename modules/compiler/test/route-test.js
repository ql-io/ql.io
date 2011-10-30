var compiler = require('lib/compiler');

exports['route get'] = function (test) {
    var q = "des = describe foo; return {} via route '/foo/bar' using method get;";
    var compiled = compiler.compile(q);
    test.equals(compiled.length, 2, 'expected two statements');
    test.equals(compiled[0].type, 'describe', 'expected describe');
    test.equals(compiled[1].type, 'return', 'expected return');
    test.ok(compiled[1].route, 'expected a route');
    test.ok(compiled[1].route.path.value, '/foo/bar');
    test.ok(compiled[1].route.method, 'get');
    test.done();
};


exports['route post'] = function (test) {
    var q = "des = describe foo; return {} via route '/foo/{id}' using method post;";
    var compiled = compiler.compile(q);
    test.equals(compiled.length, 2, 'expected two statements');
    test.equals(compiled[0].type, 'describe', 'expected describe');
    test.equals(compiled[1].type, 'return', 'expected return');
    test.ok(compiled[1].route, 'expected a route');
    test.ok(compiled[1].route.path.value, '/foo/{id}');
    test.ok(compiled[1].route.method, 'post');
    test.done();
};