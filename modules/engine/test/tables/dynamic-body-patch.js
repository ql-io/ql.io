var MutableURI = require('ql.io-mutable-uri'),
    fs = require('fs'),
    mustache = require('mustache');

exports['patch uri'] = function(args) {
    return new MutableURI('https://api.ebay.com/ws/api.dll?appid=SubbuAll-5dfd-458a-9c9e-76e0aebe845f&version=723');
}

exports['patch headers'] = function(args) {
    return {
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '723',
        'X-EBAY-API-APP-NAME': "{config.tables.ebay.trading.bestoffers.appname}",
        'X-EBAY-API-DEV-NAME': '{config.tables.ebay.trading.bestoffers.devname}',
        'X-EBAY-API-CERT-NAME': '{config.tables.ebay.trading.bestoffers.certname}',
        'X-EBAY-API-CALL-NAME': 'getItem'
    };
}

exports['body template'] = function(args) {
    var content = fs.readFileSync(__dirname + '/getitem.xml.mu', 'utf8');
    return {
        type: 'application/xml',
        content: content
    };
}

exports['patch body'] = function(args) {
    var content = fs.readFileSync(__dirname + '/getitem.xml.mu', 'utf8');
    content = mustache.to_html(content, {
        params: args.params
    });
    return {
        type: 'application/xml',
        content: content
    };
}