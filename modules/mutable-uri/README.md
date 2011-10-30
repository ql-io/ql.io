A mutable URI parser and formatter for use by monkey patches. ql.io lets you monkey patch tables
by attaching a Node module with each table. Here is an example of how a monkey patch module could
patch the request URI.

    //
    // Patch the request URI. ql.io engine would use the returned URI.
    //
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
