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

/**
 * Add some generic headers
 */
module.exports = function responseTime() {
    return function (req, res, next) {
        var writeHead = res.writeHead;
        if(res._qlHeaders) return next();
        res._qlHeaders = true;

        res.writeHead = function (status, headers) {
            res.setHeader('X-Powered-By', 'ql.io-' + require('../../package.json').version + '/node.js-' + process.version);
            res.setHeader('Server', 'ql.io-' + require('../../package.json').version + '/node.js-' + process.version);
            res.setHeader('Date', (new Date()).toUTCString());
            res.writeHead = writeHead;
            res.writeHead(status, headers);
        };

        next();
    };
};
