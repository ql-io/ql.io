exports['validate param'] = function(options, param, value) {
    var arr;
    switch(param) {
        case 'globalid' :
            arr = ['EBAY-US', 'EBAY-AU', 'EBAY-ENCA', 'EBAY-FRCA'];
            return arr.indexOf(value) != -1;
        case 'sortorder' :
            arr = 'BestMatch|BidCountFewest|BidCountMost|CountryAscending|CountryDescending|DistanceNearest|EndTimeSoonest|PricePlusShippingHighest|PricePlusShippingLowest|StartTimeNewest'.split('|')
            return arr.indexOf(value) != -1;
        default:
            return true;
    }
}

exports['patch uri'] = function(options) {
    var statement = options.statement, uri = options.uri, params = options.params, count = 0;
    if(statement.offset && statement.limit) {
        uri.setParam('paginationInput.pageNumber', statement.offset / statement.limit);
    }
    uri.removeEmptyParams();

    count = 0
    if(params.FreeShippingOnly) {
        uri.addParam("itemFilter(" + count + ").name", 'FreeShippingOnly');
        uri.addParam("itemFilter(" + count + ").value", params.FreeShippingOnly);
        count++;
    }
    if(params.MinPrice) {
        uri.addParam("itemFilter(" + count + ").name", 'MinPrice');
        uri.addParam("itemFilter(" + count + ").value", params.MinPrice);
        count++;
    }
    return uri;
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
