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
module.exports  =  {
    'if-empty' : function(test) {
    var q;
    q = 'z = {}\n\
         if (z) \n\
         {a = false}\n\
         else \n\
         {   }   \n\
         return a;';

    engine.exec({script: q, cb: function(err, result) {
        if(err) {
            test.fail('got error: ' + err.stack);
            test.done();
        }
        else {
            test.equal(result.body, false);
            test.done();
        }
    }});
},
    'nested-if' : function(test) {
        var q;
        q = 'z = null \n\
            j = "happy" \n\
            if (!z) \n\
            {       \n\
                if (j )    \n\
                {             \n\
                    a = "sad"  \n\
                }              \n\
            }                  \n\
            else               \n\
            {                  \n\
                b = "enjoy"    \n\
            }                  \n\
            return a;';

        engine.exec({script: q, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equal(result.body, "sad");
                test.done();
            }
        }});
},
    'nested-if-else' : function(test) {
        var q;
        q = 'z = null \n\
            j = "happy" \n\
            if (!z)    \n\
            {          \n\
                if (!j )  \n\
                {          \n\
                    a = "sad"  \n\
                }            \n\
                else         \n\
                {        \n\
                    c= "sleepy"   \n\
                }          \n\
            }             \n\
            else         \n\
            {              \n\
                b = "enjoy"   \n\
            }                 \n\
            return a || c || b;';

        engine.exec({script: q, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equal(result.body, "sleepy");
                test.done();
            }
        }});
    },
    'nested-if-else-nodefine' : function(test) {
        var q;
        q = 'if (!z)    \n\
            {          \n\
                if (!j )  \n\
                {          \n\
                    a = "sad"  \n\
                }            \n\
                else         \n\
                {        \n\
                    c= "sleepy"   \n\
                }          \n\
            }             \n\
            else         \n\
            {              \n\
                b = "enjoy"   \n\
            }                 \n\
            return b || c || a;';

        engine.exec({script: q, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equal(result.body, "sad");
                test.done();
            }
        }});
    },
    'nested-if-else-undefined' : function(test) {
        var q;
        q = 'if (x||y) \n\
            {          \n\
                q= 12345    \n\
                if (!j )    \n\
                {           \n\
                    g = "sad"  \n\
                }                 \n\
                else              \n\
                {                \n\
                    d= "sleepy"   \n\
                }                 \n\
            }                     \n\
            else                 \n\
            {                     \n\
                e = "enjoy"       \n\
            }                     \n\
            return q||g|| d||e;';

        engine.exec({script: q, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equal(result.body, "enjoy");
                test.done();
            }
        }});
    },
    'nested-else-undefined' : function(test) {
        var q;
        q = 'if (x||y)    \n\
            {             \n\
                q= 12345  \n\
            }             \n\
            else          \n\
            {             \n\
                if (j )   \n\
                {         \n\
                    g = "sad"   \n\
                }               \n\
                else            \n\
                {               \n\
                    d= "sleepy"  \n\
                }               \n\
                e = "enjoy"     \n\
            }                  \n\
            return g||d||e||q;';

        engine.exec({script: q, cb: function(err, result) {
            if(err) {
                test.fail('got error: ' + err.stack);
                test.done();
            }
            else {
                test.equal(result.body, "sleepy");
                test.done();
            }
        }});
    }
};


