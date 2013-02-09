/*
* Copyright 2013 eBay Software Foundation
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
var aop = require('../lib/engine/aop.js')
module.exports = {
    'naive' : function(test){
        function Document(){}
        Document.prototype = {
            _id: 0,
            _name: '',

            name: function() {
                return this._name;
            },

            id: function() {
                return this._id;
            },

            save: function() {
                return true;
            },

            open: function(id) {
                this._id = id;
                this._name = 'Ajax on AOP steroids'
                return true;
            }
        }
        function openDocument(id)
        {
            var doc = new Document();
            try {
                doc.open(id);
            }
            catch(e)
            {
                alert(e);
                return;
            }

            // Update icons and other user elements affected  alert("Doc id: " + doc.id());
            return doc;
        }
        function Lockable(){}
        Lockable.prototype = {
            _locked: false,

            locked: function() {
                return this._locked;
            }
        }
        function lockOnOpen()
        {
            // Lock this object
            // If we didn't succeed
            //throw (new Error ("Failed locking " + this._name));

            // The object is locked
            this._locked = true;
            var ret = arguments[0].apply(this, arguments)
            return ret;
        }
        try {
            aop.addIntroduction(Lockable, Document);
            aop.addAround(lockOnOpen, Document, "open");
            test.done()
        }
        catch(e)
        {
            console.log('epic fail')
        }
    }
}
