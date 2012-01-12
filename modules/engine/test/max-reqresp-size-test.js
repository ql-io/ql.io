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

var _ = require('underscore'),
    Engine = require('../lib/engine'),
    logger = require('winston');

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {level: 'error'});

var engine = new Engine({
    tables : __dirname + '/tables',
    config: __dirname + '/config/dev.json',
    connection: 'close'
});

module.exports = {
    'response-from-server': function(test) {
        // temporarily lower the max in order to run this test
        var defaultMaxResponseLength = engine.config.maxResponseLength;
        engine.config.maxResponseLength = 5000;

        var script = "create table maxtable \
                    on select get from 'http://svcs.ebay.com:80/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}'\
                     with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'\
                     using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',\
                           apikey = '{config.ebay.apikey}', limit = 1000, pageNumber = 1\
                     resultset 'findItemsByKeywordsResponse.searchResult.item';\n\
        select * from maxtable where keywords = 'ipad'";
        engine.exec(script, function(err, list) {
            logger.log('engine.config.maxResponseLength' + engine.config.maxResponseLength);
            if (!err) {
                test.fail('did not get expected error');
                test.done();
            } else {
                test.equals(err.status, 502, '502 status code expected');
                test.equals(err.message, 'Response length exceeds limit', 'Error explanation expected');
                test.done();
            }
        });
        engine.config.maxResponseLength = defaultMaxResponseLength;
    }
}