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
var zlib = require('zlib'),
    headers = require('headers'),
    _ = require('underscore');

/**
 * Supported content-encoding methods.
 * TODO right default options for the compression
 */
exports.methods = {
    gzip:zlib.createGzip,
    deflate:zlib.createDeflate,
    '*':zlib.createGzip
};

/**
 * Default filter function. returns true.
 */
exports.filter = function (req, res) {
    return true;
};

module.exports = function compress(options) {

    var options = options || {},
        filter = options.filter || exports.filter;

    return function encode(req, res, next) {

        var acceptEncoding = req.headers['accept-encoding'],
            write = res.write,
            end = res.end,
            methods = exports.methods,
            stream;

        // Set the Vary header
        res.setHeader('vary', 'accept-encoding');

        res.write = function (chunk, enc) {
            return stream? stream.write(chunk, enc) : write.call(res, chunk, enc);
        };

        res.end = function (chunk, enc) {
            if (chunk) {
                this.write(chunk, enc);
            }
            return stream ? stream.end() : end.call(res);
        };

        res.on('header', function () {
            var method;

            // filter
            if (!filter(req, res)) {
                return;
            }

            // null and empty accept encoding means identity.
            if(!acceptEncoding || '' === acceptEncoding.trim()) {
                return;
            }

            // HEAD requests
            if('HEAD' === req.method) {
                return;
            }

            // Default to gzip.
            if ('*' === acceptEncoding.trim()) {
                method = 'gzip';
            }

            if (!method) {
                // find the accept method quick, considering
                // typical accept-encoding values.
                var encodings = headers.parse('accept-encoding', acceptEncoding);
                for (var i = 0, len = encodings.length; i < len; ++i) {
                    if (!encodings[i].params.q) {
                        // q factor of 1
                        if(_.has(methods, method)) {
                            method = encodings[i].encoding;
                            break;
                        }
                    }
                    if (encodings[i].params.q === '0') {
                        delete encodings[i];
                    }
                }
                if (!method) {
                    encodings = _.without(encodings, 'undefined'); // Removed deleted elements (q=0)
                    if (encodings.length > 0) {
                        var ordered = _.sortBy(encodings, function (enc) {
                            return -enc.params.q;
                        });
                        for (var i = 0, len = ordered.length; i < len; ++i) {
                            if (_.has(methods, ordered[i].encoding)) {
                                method = ordered[i].encoding;
                                break;
                            }
                        }
                    }
                }
                if('*' === method ) {
                    method = 'gzip';
                }
            }

            // found a method.
            if (method) {
                stream = methods[method](options);
                res.setHeader('content-encoding', method);

                stream.on('data', function (chunk) {
                    write.call(res, chunk);
                })

                stream.on('end', function () {
                    end.call(res);
                });
            }
            //
            // else {
            //     res.writeHead(406)....
            // }
            //
            // Instead of sending 406, if not capable of generating response
            // entities which have content characteristics not acceptable according
            // to the accept headers sent in the request, send 'identity'.
            //
        });
        next();
    };
}
