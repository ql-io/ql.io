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

var _ = require('underscore');

exports['patch response'] = function(args) {
    var body = args.body;
    var items = [];

    if (body && body.findItemsByKeywordsResponse && body.findItemsByKeywordsResponse.searchResult && body.findItemsByKeywordsResponse.searchResult.item) {

        for (var i = 0; i < body.findItemsByKeywordsResponse.searchResult.item.length; i++){
            var result = body.findItemsByKeywordsResponse.searchResult.item[i];
            if (result) {
                var item = {};
                _.each(result, function(v, k) {
                    item['_' + k + '_'] = v; // rename vars for the test
                });
                items.push(item);
            }
        }

        // put items into 'items' instead of 'item'
        // a normal response (without body patching) would expect 'item'
        body.findItemsByKeywordsResponse.searchResult.items = items;
    }

    return body;
}

exports['patch status'] = function(options) {
    var json = options.body;
    if(json && ((json.findItemsByKeywordsResponse && json.findItemsByKeywordsResponse.ack === 'Failure') ||
        json.errorMessage)) {
        return 400;
    }
    else {
        return 200;
    }
}
