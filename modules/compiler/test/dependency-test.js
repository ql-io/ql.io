// Use expresso to run this

var compiler = require('lib/compiler'),
    _ = require('underscore'),
    sys = require('sys');

module.exports = {
    'define-dependency' : function(test) {
        var script, cooked;
        script = 'a = "a";\
                  b = "{a}";\
                  c = "{b}";\
                  return c;'
        try {
            cooked = compiler.compile(script);
            test.equals(cooked[0].listeners.length, 1);
            test.equals(cooked[0].listeners[0], 1);
            test.equals(cooked[1].dependsOn.length, 1);
            test.equals(cooked[1].dependsOn[0], 0);
            test.equals(cooked[1].listeners.length, 1);
            test.equals(cooked[1].listeners[0], 2);
            test.equals(cooked[2].dependsOn.length, 1);
            test.equals(cooked[2].dependsOn[0], 1);
            test.done();
        }
        catch(e) {
            console.log(e.stack || e);
            test.fail(e);
            test.done();
        }
    }
};
