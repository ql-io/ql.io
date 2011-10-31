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
    sys = require('sys');

var engine = new Engine({
    config: __dirname + '/config/dev.json',
    connection: 'close'
});

exports['temp-table'] = function(test) {
    var script;
    script = "create table items\n\
        on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID=EBAY-US&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT=XML&REST-PAYLOAD&keywords={^keywords}&outputSelector%280%29=SellerInfo&sortOrder=BestMatch'\n\
            using defaults apikey =  '{config.ebay.apikey}'\n\
            resultset 'findItemsByKeywordsResponse.searchResult.item'\n\
        select * from items where keywords = 'iPhone 5'";
    engine.exec(script, function(err, result) {
        if(err) {
            console.log(err.stack || sys.inspect(err, false, 10));
            test.fail('got error');
            test.done();
        }
        else {
            test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
            test.ok(_.isArray(result.body), 'expected an array');
            test.ok(result.body.length > 0, 'expected some items');
            test.ok(!_.isArray(result.body[0]), 'expected object in the array');
            test.done();
        }
    });
}
