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
