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

udf.declare('contains', function(arg) {
    return {
        operator: 'CONTAINS',
        exprType: 'KeywordLogicalExpression',
        operandType: 'TokenOperand',
        operand: arg[0].value
    };
});

udf.declare('blendBy', function(percentage) {
    return {
        name: 'ITEM_FORMAT',
        namespace: 'ItemDictionary',
        property: [
            {
                name: 'isUsedForIntermingle',
                value: 'true'
            }
        ],
        auctionPercentage : percentage
    }
});

request.before('validate.param', function(options, param, value) {
    var arr;
    switch(param) {
        case 'globalid' :
            arr = ['EBAY-US', 'EBAY-AU', 'EBAY-ENCA', 'EBAY-FRCA'];
            return arr.indexOf(value) != -1;
        case 'sortorder' :
            arr = 'BestMatch|BidCountFewest|BidCountMost|CountryAscending|CountryDescending|DistanceNearest|EndTimeSoonest|PricePlusShippingHighest|PricePlusShippingLowest|StartTimeNewest'.split('|')
            return arr.indexOf(value) != -1;
    }
});

request.before('uri', function(options) {
    var statement = options.statement, uri = options.uri, params = options.params, count = 0;
    uri.setParam('paginationInput.pageNumber', statement.offset / statement.limit);
    uri.removeEmptyParams();

    count = 0
    if(params.FreeShippingOnly) {
        uri.addParam("itemFilter({count}).name", 'FreeShippingOnly');
        uri.addParam("itemFilter({count}).value", c.rhs.value);
        count++;
    }
    if(params.MinPrice) {
        uri.addParam("itemFilter({count}).name", 'MinPrice');
        uri.addParam("itemFilter({count}).value", c.rhs.value);
        count++;
    }
});

// options = uri, statement, params, headers, status, headers, body
response.patch('status', function(options) {
    var json = options.body;
    if(json && ((json.findItemsByKeywordsResponse && json.findItemsByKeywordsResponse.ack === 'Failure') ||
        json.errorMessage)) {
        return 400;
    }
    else {
        return 200;
    }
});

response.patch('mediaType', function(options) {
   return "application/xml";
});
