/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var Engine = require('../lib/engine');

var engine = new Engine();
module.exports['if'] = function(test) {
    var context, q;
    context = {
        foo : {
            'hello' : 'Hello',
            'world' : 'World'
        },
        bar : {
            'chocolate' : 'Chocolate',
            'milk' : 'Milk'
        },
        zero : null
    };
    q = 'mycond = select * from foo\n\
        empty = select * from zero\n\
        if(empty || !!mycond){a = select * from foo}\n\
        else {\n\
        b = select * from bar}\n\
        return "{a}" || "{b}"';
    engine.exec({script: q, context: context, cb: function(err, result) {
        if(err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.deepEqual(result.body, context.foo);
            test.done();
        }
    }});
};

module.exports['trycatch'] = function(test) {
    var context, q;
    context = {
        foo : {
            'hello' : 'Hello',
            'world' : 'World'
        },
        bar : {
            'chocolate' : 'Chocolate',
            'milk' : 'Milk'
        }
    };
    q = 'try {\n\
            b = select * from foo;\n\
            throw (hello)}\n\
            catch (hello){\n\
            a =select * from foo}\n\
            return a || b';
    engine.exec({script: q, context: context, cb: function(err, result) {
        if(err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.deepEqual(result.body, context.foo);
            test.done();
        }
    }});
};

module.exports['finally1'] = function(test) {
    var context, q;
    context = {
        foo : {
            'hello' : 'Hello',
            'world' : 'World'
        },
        bar : {
            'chocolate' : 'Chocolate',
            'milk' : 'Milk'
        }
    };
    q = 'try {\n\
            b = select * from foo;\n\
            throw (hello)}\n\
            catch (hello){\n\
            a =select * from foo}\n\
            finally{\n\
            c = 1\n\
            }\n\
            return c || a';
    engine.exec({script: q, context: context, cb: function(err, result) {
        if(err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.deepEqual(result.body, 1);
            test.done();
        }
    }});
};

module.exports['else'] = function(test) {
        var context, q;
        context = {
            foo : {
                'hello' : 'Hello',
                'world' : 'World'
            },
            bar : {
                'chocolate' : 'Chocolate',
                'milk' : 'Milk'
            },
            cond : 0
        };
        q = 'mycond = select * from cond\n\
        if(mycond){a = select * from foo}\n\
        else {\n\
        b = select * from bar}\n\
        return "{a}" || "{b}"';
        engine.exec({script: q, context: context, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.deepEqual(result.body, context.bar);
                test.done();
            }
        }});
    };

module.exports['trycatch-with-if'] = function(test) {
    var context, q;
    context = {
        foo : {
            'hello' : 'Hello',
            'world' : 'World'
        },
        bar : {
            'chocolate' : 'Chocolate',
            'milk' : 'Milk'
        },
        empty : null,
        cond : 1
    };
    q = 'try {\n\
            b = select * from foo;\n\
            throw (hello)\n\
            if(d){\n\
            throw (world)}\n\
            }\n\
            catch (hello){\n\
            a =select * from foo}\n\
            catch (world){\n\
            c = select * from empty}\n\
            return c || a || b';
    engine.exec({script: q, context: context, cb: function(err, result) {
        if(err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.deepEqual(result.body, context.foo);
            test.done();
        }
    }});
};

module.exports['trycatch-nested'] = function(test) {
    var context, q;
    context = {
        foo : {
            'hello' : 'Hello',
            'world' : 'World'
        },
        bar : {
            'chocolate' : 'Chocolate',
            'milk' : 'Milk'
        },
        empty : null,
        cond : 1
    };
    q = 'try{try {\n\
            b = select * from foo;\n\
            throw (hello)\n\
            if(d){\n\
            throw (world)}\n\
            }\n\
            catch (hello){\n\
            a =select * from foo}\n\
            catch (world){\n\
            c = select * from empty}\n\
            throw(abc)\n\
            }catch(abc){}\n\
            return c || a || b';
    engine.exec({script: q, context: context, cb: function(err, result) {
        if(err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.deepEqual(result.body, context.foo);
            test.done();
        }
    }});
};

module.exports['ifelse-nested'] = function(test) {
    var context, q;
    context = {
        foo : {
            'hello' : 'Hello',
            'world' : 'World'
        },
        bar : {
            'chocolate' : 'Chocolate',
            'milk' : 'Milk'
        },
        empty : null,
        cond : 1
    };
    q = 'if (x||y)\n\
    {\n\
        q= 12345\n\
        if (!j )\n\
        {\n\
            g = "sad"\n\
        }\n\
        else\n\
        {\n\
            d= "sleepy"\n\
        }\n\
    }\n\
    else\n\
    {\n\
        e = "enjoy"\n\
    }\n\
    return q||g|| d||e;';
    engine.exec({script: q, context: context, cb: function(err, result) {
        if(err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.equals(result.body, "enjoy");
            test.done();
        }
    }});
};

module.exports['ifelse-nested'] = function(test) {
    var q = 'foo = true \
    bar = false\
    try{\
        mycond = select * from bar\
        if(mycond){\
            result4 = "hello world";\
        }else{\
            NoLanguagePack = true\
            throw (NoLanguagePack)\
        } \
    }\
    catch (NoLanguagePack){\
        result3 = "not found"\
    }\
    return result4 || result3';
    engine.exec({script: q, cb: function(err, result) {
        if(err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.equals(result.body, "not found");
            test.done();
        }
    }});
}

