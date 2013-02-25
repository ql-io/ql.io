/*
 * Code taken from Danne Lundqvist with custom modification
 * http://www.dotvoid.com/2005/06/aspect-oriented-programming-and-javascript/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var InvalidAspect = new Error("Missing a valid aspect. Aspect is not a function.");
var InvalidObject = new Error("Missing valid object or an array of valid objects.");
var InvalidMethod = new Error("Missing valid method to apply aspect on.");

function doAround(func, aroundFunc){
    return function(){
        aroundFunc.prototype._innerFunc = func

        return aroundFunc.apply(this,arguments)
    };
}

Aspects = function(){};
Aspects.prototype={


    addIntroduction : function(aspect, objs){
        function _addIntroduction(intro, obj){
            for (var m in intro.prototype) {
                obj.prototype[m] = intro.prototype[m];
            }
        }
        var oType = typeof(objs);

        if (typeof(aspect) != 'function')
            throw(InvalidAspect);

        if (oType == 'function'){
            _addIntroduction(aspect, objs);
        }
        else if (oType == 'object'){
            for (var n = 0; n < objs.length; n++){
                _addIntroduction(aspect, objs[n]);
            }
        }
        else{
            throw InvalidObject;
        }
    },

    addAround : function(aspect, obj, funcs){
        if (typeof(aspect) != 'function')
            throw InvalidAspect;

        if (typeof(funcs) != 'object')
            funcs = Array(funcs);

        for (var n = 0; n < funcs.length; n++)
        {
            var fName = funcs[n];
            var old;
            if(obj){
                old = obj.prototype[fName];
            }
            if (!old)
                throw InvalidMethod;

            var res = doAround(old,aspect);
            obj.prototype[fName] = res;
        }

    }

}
exports.addIntroduction = Aspects.prototype.addIntroduction
exports.addAround = Aspects.prototype.addAround