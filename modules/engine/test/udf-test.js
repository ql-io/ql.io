/*
 * Copyright 2012 eBay Software Foundation
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

var _ = require('underscore'),
    util = require('util'),
    Engine = require('../lib/engine');

var engine = new Engine();

var script = 'a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},\
                    {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},\
                    {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];\
              keyset = select name, keys..name from a1;\                    \
              a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},\
                    {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];\
              return select a2.name, a2.details from a1 as a1, a2 as a2 where a1.name = a2.name';

engine.execute(script, function(emitter) {
    emitter.on('end', function(err, results) {
        console.log(util.inspect(results.body, false, 10));
    })
});
