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

"use strict"

var _ = require('underscore'),
    Console = require('../app.js'),
    http = require('http'),
    express = require('express'),
    url = require('url');

module.exports = {
    'check delete /del/foo/bar/{selector}?userid={userId}&itemid={itemId}' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/del/foo/bar/Details?userid=sallamar&itemid=260852758792',
                    method : 'DELETE'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        var json = JSON.parse(data);
                        test.ok(json.user, 'missing user data');
                        test.ok(json.user.Ack, 'missing user Ack');
                        test.equal(json.user.Ack, 'Success');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'check delete /del/foo/bar/{selector}?userid={userId}' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/del/foo/bar/Details?userid=sallamar',
                    method : 'DELETE'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        var json = JSON.parse(data);
                        test.ok(json.user, 'missing user data');
                        test.ok(json.user.Ack, 'missing user Ack');
                        test.equal(json.user.Ack, 'Success');
                        test.equal(json.bestOffers, 'Fixed Value');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'check delete /del/foo/bar/{selector}?userid={userId}&address={itemId}' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/del/foo/bar/Details?userid=sallamar&address=260852758792',
                    method : 'DELETE'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        var json = JSON.parse(data);
                        test.ok(json.user, 'missing user data');
                        test.ok(json.user.Ack, 'missing user Ack');
                        test.equal(json.user.Ack, 'Success');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'check post json' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/ping/pong',
                    method : 'POST',
                    headers : {
                        'content-type' : 'application/json'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val" : {"postPayload" : {"ItemID" : "1818", "UserID" : "someone"}}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('{"itemId":1818,"userId":"someone"}');
                req.end();

            });
        });
    },
    'check post urlencoded' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/ping/pong',
                    method : 'POST',
                    headers : {
                        'content-type' : 'application/x-www-form-urlencoded'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val" : {"postPayload" : {"ItemID" : "1818", "UserID" : "someone"}}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('itemId=1818&userId=someone');
                req.end();

            });
        });
    },
    'check post xml' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/ping/pongxml',
                    method : 'POST',
                    headers : {
                        'content-type' : 'application/xml'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val" : {"postPayload" : {"ItemID" : "1818", "UserID" : "someone"}}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('<payload><itemId>1818</itemId><userId>someone</userId></payload>');
                req.end();
            });
        });
    },
    'check put urlencoded' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.post('/ping/pong', function(req, res) {
                var data = '';
                req.on('data', function(chunk) {
                    data += chunk;
                });
                req.on('end', function() {
                    res.send(data);
                });
            });

            testHttpapp.listen(80126, function() {

                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/ping/pong',
                    method : 'PUT',
                    headers : {
                        'content-type' : 'application/x-www-form-urlencoded'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val" : {"postPayload" : {"ItemID" : "1818", "UserID" : "someone"}}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('itemId=1818&userId=someone');
                req.end();
            });
        });
    },
    'check post for no mu' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.get('/bing/bong', function(req, res) {
                req.on('data', function(chunk) {
                    // do nothing
                });
                req.on('end', function() {
                    res.send(JSON.stringify(url.parse(req.url, true).query));
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/bing/bong',
                    method : 'POST',
                    headers : {
                        'content-type' : 'application/json'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val":{"QueryKeywords":"ipod"}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('{"keywords":"ipod"}');
                req.end();

            });
        });
    },
    'check put for no mu' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.get('/bing/bong', function(req, res) {
                req.on('data', function(chunk) {
                    // do nothing
                });
                req.on('end', function() {
                    res.send(JSON.stringify(url.parse(req.url, true).query));
                });
            });

            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/bing/bong',
                    method : 'PUT',
                    headers : {
                        'content-type' : 'application/json'
                    }
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.deepEqual(JSON.parse(data), {"val":{"QueryKeywords":"ipod"}});
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write('{"keywords":"ipod"}');
                req.end();

            });
        });
    },
    'case sensitivity' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(4000, function () {
        });

        var options = {
            host:'localhost',
            port:4000,
            path:'/DEl/foo/bar/Details?userid=sallamar&itemid=260852758792',
            method:'DELETE'
        };
        var req = http.request(options);
        req.addListener('response', function (resp) {
            var data = '';
            resp.addListener('data', function (chunk) {
                data += chunk;
            });
            resp.addListener('end', function () {
                test.equal(resp.statusCode, 404);
                c.app.close();
                test.done();
            });
        });
        req.end();
    },
    'insert' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(4000, function () {
        });

        var options = {
            host:'localhost',
            port:4000,
            path:'/ebay/trading/uploadpic?pic=http://developer.ebay.com/DevZone/XML/docs/images/hp_book_image.jpg',
            method:'POST'
        };
        var req = http.request(options);
        req.addListener('response', function (resp) {
            var data = '';
            resp.addListener('data', function (chunk) {
                data += chunk;
            });
            resp.addListener('end', function () {
                test.equal(resp.statusCode, 404);
                c.app.close();
                test.done();
            });
        });
        req.end();
    },
    'insert part' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(4000, function () {
        });

        var options = {
            host:'localhost',
            port:4000,
            path:'/ebay/trading/uploadpicparts?pic=http://developer.ebay.com/DevZone/XML/docs/images/hp_book_image.jpg&part=something',
            method:'POST'
        };
        var req = http.request(options);
        req.addListener('response', function (resp) {
            var data = '';
            resp.addListener('data', function (chunk) {
                data += chunk;
            });
            resp.addListener('end', function () {
                test.equal(resp.statusCode, 404);
                c.app.close();
                test.done();
            });
        });
        req.end();
    },
    'opaque': function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.listen(80126, function() {
                var mybody = '<?xml version="1.0" encoding="utf-8"?>\n<UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">\n\
        <ExternalPictureURL>http://developer.ebay.com/DevZone/XML/docs/images/hp_book_image.jpg</ExternalPictureURL> \n\
        <PictureName>HarryPotterPic-1</PictureName>\n\
            <RequesterCredentials>\n\
            <eBayAuthToken>AgAAAA**AQAAAA**aAAAAA**y9VlUQ**nY+sHZ2PrBmdj6wVnY+sEZ2PrA2dj6wFk4GhCpKHowudj6x9nY+seQ**jsABAA**AAMAAA**KgOrlPsYwnWnatySM0BdA+RT2StvIf5qx4xmmqpAFbpq405LS7WVg84i638YwjhheG2MfYHQfHCPyW6T6x9KMeJEkAGUyHAiZHVgO8QNN1SaxS4J6g+E6c5VzZzTW+2NMxvpM9bjR3UDGaa5B3IQYI4E+0Ve3r6Nhf++0Qryl5tSd/XOxaaej8tVLU3VR2j9ejB5IJ5vaYvNZ74blVKrdu37dGD2btorJ30m74+lyk7WyWCxSoxfber1R5SBnWuQ4t0yI3ttLT6D+PMP1lfnTQ+AX6ijIPhBoeEWyPaqpHhGlQCfSYtivqQ/S6moJi7E1ByFMWmnNDNSv/DDaPTOhPGeV2IhFageF3R4+zw89Ah3LVFq9ZLo4kgaGeilgfDOkCMiONlS3H3bltnsMVC30Gtfwq16cxZwSA1HyAyNF5A7sJEhgnU40qjF0vk9memc7BmBQ0rzv3WLAKtPtKS6x5zs9n95cxwAH4eI1zFR4o3Nesn27piilVLRpftvh9+NfLkvBQrPuurrrKi6K9SXgei/dxivUhIov2onezKOpikhSi9NUnPKc+xFhJehaOwJ6mc1m6bOi84AsPic13YTRUXVktcxgl5yywT9Zm5o5QiAOaWHuXdpSTtae8QeHBeUwG3G72xyNH4who+aHkEA2U3sNST27oL8cm8vz0dvJB3RikY9i7nHBIv4DOzsQvEM7hI7gW5AK7RnBgwm8rr4psHAR59dEjLZN97MIzTWFBOVwFm5SoUZMo4McO4Hmxa7</eBayAuthToken>\n\
        </RequesterCredentials>\n\
        </UploadSiteHostedPicturesRequest>'
                var mypath = '/ebay/trading/opaque?body='+mybody
                var options = {
                    host : 'localhost',
                    port : 3000,
                    //path: '/uploadpic',
                    path : '/ebay/trading/opaque',
                    //path: '/ping/pong',
                    method : 'POST',
                    headers : {
                        'content-type' : 'opaque'//'application/xml'
                        //'opaque' : true
                    }

                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        try{
                            var json = JSON.parse(data);
                        }catch (e){
                            test.ok(false, "response is not json")
                        }
                        test.equal(json.Ack, "Success");
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.write(mybody);
                //req.opaque = true;
                //req.body = 'opaque'
                req.end();

            });
        });
    },
    'optional param' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/profile?kw=wii',
                    method : 'GET'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        var json = JSON.parse(data);
                        test.ok(_.isArray(json), 'expecting an array');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'optional param all' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/profile?kw=wii&messageid=junk&include=hello&userid=test1',
                    method : 'GET'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        var json = JSON.parse(data);
                        test.ok(_.isArray(json), 'expecting an array');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'optional param no required provided -negative' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/profile',
                    method : 'GET'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.equal(data, '{"err":"No matching route"}');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'no optional param syntax -negative' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/all?key=wii',
                    method : 'GET'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        test.equal(data, '{"err":"No matching route"}');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'default route values' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/finddefault?kw=wii',
                    method : 'GET'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        try{
                            var json = JSON.parse(data);
                        }catch (e){
                            test.ok(false, "response is not json")
                        }
                        test.ok(_.isArray(json), 'expected an array');
                        test.equal(json.length, 1);
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'default required' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/finddefault',
                    method : 'GET'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        try{
                            var json = JSON.parse(data);
                        }catch (e){
                            test.ok(false, "response is not json")
                        }
                        test.ok(_.isArray(json), 'expected an array');
                        test.equal(json.length, 1);
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    },
    'default in regular route' : function(test) {
        var c = new Console({
            tables : __dirname + '/tables',
            routes : __dirname + '/routes/',
            config : __dirname + '/config/dev.json',
            'enable console' : false,
            connection : 'close'
        });
        c.app.listen(3000, function() {
            var testHttpapp = express.createServer();
            testHttpapp.listen(80126, function() {
                var options = {
                    host : 'localhost',
                    port : 3000,
                    path : '/profile?messageid=mid&include=Details',
                    method : 'GET'
                };
                var req = http.request(options);
                req.addListener('response', function(resp) {
                    var data = '';
                    resp.addListener('data', function(chunk) {
                        data += chunk;
                    });
                    resp.addListener('end', function() {
                        try{
                            var json = JSON.parse(data);
                        }catch (e){
                            test.ok(false, "response is not json")
                        }
                        test.equal(json.Ack, 'Success');
                        c.app.close();
                        testHttpapp.close();
                        test.done();
                    });
                });
                req.end();
            });
        })
    }
}
