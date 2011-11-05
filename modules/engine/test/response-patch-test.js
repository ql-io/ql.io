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

var _ = require('underscore'),
    Engine = require('lib/engine'),
    sys = require('sys'),
    logger = require('winston');

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    'connection': 'close'
});

module.exports = {
    'response-patch-test': function(test) {
        var script = "select * from ebay.finding.items.rp where keywords = 'ferrari' limit 2;"

	engine.exec(script, function(err, result) {
	    if (err) {
		logger.debug("ERROR: " + JSON.stringify(err));
                test.ok(false);
		test.done();
	    } else if (result) {
		logger.debug("RESULT: " + JSON.stringify(result));
                test.ok(result.body);
		test.done();
	    }
	});
    }
}