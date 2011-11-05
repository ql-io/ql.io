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
