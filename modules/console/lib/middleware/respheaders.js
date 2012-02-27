/**
 * Add some generic headers
 */

module.exports = function responseTime() {
    return function (req, res, next) {
        var writeHead = res.writeHead;
        if(res._qlHeaders) return next();
        res._qlHeaders = true;

        res.writeHead = function (status, headers) {
            res.setHeader('X-Powered-By', 'ql.io/node.js ' + process.version);
            res.setHeader('Server', 'ql.io-' + require('../../package.json').version + '/node.js-' + process.version);
            res.setHeader('Date', (new Date()).toUTCString());
            res.writeHead = writeHead;
            res.writeHead(status, headers);
        };

        next();
    };
};
