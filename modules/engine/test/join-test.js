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

'use strict';

var Engine = require('../lib/engine');

var engine = new Engine();

module.exports = {
    'expr?': function(test) {
        var script = 'create table bart   \
        on select get from "http://api.bart.gov/api/stn.aspx?cmd=stninfo&orig=12th&key=MW9S-E7SL-26DU-VV8V"\
        resultset "root.stations.station" \
        create table myg  \
        on select get from "http://maps.googleapis.com/maps/api/geocode/json?latlng={lo},{la}&sensor=true"  \
        select g.results from bart as b, myg as g where b.gtfs_latitude = g.lo and g.la = b.gtfs_longitude'
        engine.execute(script, function(emitter) {
            emitter.on('end', function(err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack);
                    test.done();
                }
                else {
                    test.done();
                }
            });
        });
    }
};
