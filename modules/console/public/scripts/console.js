$(document).ready(function() {
    var oldInput, parseTimer, compiler, editor, markers = [], headers, har,
        runState, socket, emitter, emitterID, results, html, wsEnabled, step,
        EventEmitter = require('events').EventEmitter, formatter = new JSONFormatter();

    // IE8 is not supported
    if($.browser.msie) {
        $('<div></div>')
            .html('We have nothing against IE, but we do not have the cycles to make this console work for IE8 or older. Use latest version of Chrome or Firefox.')
            .dialog({
                autoOpen: false,
                title: 'Do not use IE'
            }).dialog('open');
    }

    $(window).resize(function() {
        $('#top-pane').width('99%');
        $('#bottom-pane').width('100%');
        $('.hsplitbar').width('100%');
    });

    $('#step').hide();
    // Splitter to show har data
    $('#splitter').splitter({
        splitHorizontal: true,
        resizeTo: window,
        sizeBottom: true
    });

    // Init the har view widget
    $('#har').HarView();
    har = $('#har').data('HarView');

    compiler = require('ql.io-compiler');
    headers = require('headers');

    editor = CodeMirror.fromTextArea(document.getElementById('query-input'), {
        lineNumbers: true,
        matchBrackets: true,
        lineWrapping: true,
        fixedGutter: true,
        indentUnit: 4,
        onChange: function() {
            scheduleParse();
        },
        mode: 'text/x-qlio'
    });

    $('#util-links').hide();
    oldInput = '-- Type ql script here - all keywords must be in lower case';

    setTimeout(function() {
        probeWs(socket, function(e, r) {
            if(e) {
                $('#conn-status').html('Use latest versions of Firefox or Chrome for better experience.');
            }
            else {
                wsEnabled = true;
            }
            scheduleParse();
        });
    }, 100);

    function parse() {
        var statement, escaped, compiled;
        oldInput = editor.getValue();
        $('#query-input').removeAttr('disabled');

        statement = editor.getValue().replace(/\uFEFF/g, '');
        statement = $.trim(statement);
        escaped = encodeURIComponent(statement);
        try {
            compiled = compiler.compile(statement);
            if(compiled.length === undefined) {
                compiled = [compiled];
            }
            if(compiled.length > 0) {
                $('#parse-status').hide();
                $('#util-links').show();

                $('#run').unbind();
                $('#run').click(function() {
                    killPrevEvent();
                    $('#step').hide();
                    emitterID = 0;
                    runQuery(statement, escaped, compiled);
                    pastePic();
                });

                $('#debug').unbind();
                $('#debug').click(function() {
                    killPrevEvent();
                    //temporarily assign a place holder for emitterID
                    emitterID = 1;
                    // step number in debugging.
                    step = 1;
                    runQuery(statement, escaped, compiled, true);
                    $('#step').show();
                    pastePic(compiled);
                });

                $('#step').unbind();
                $('#step').click(function() {
                    packet = {
                        type : 'debug',
                        emitterID : emitterID
                    };
                    socket.send(JSON.stringify(packet));
                });
            }
        }
        catch (e) {
            $('#util-links').hide();
            $('#parse-status').show();
            $('#parse-status').text(buildErrorMessage(e));
            var result = false;
        }
        return result;
    }

    function scheduleParse(now) {
        if(editor.getValue() === oldInput) {
            return;
        }

        for(var i = 0; i < markers.length; i++) {
            editor.clearMarker(markers[i]);
        }

        // Reset state
        runState = {
            version: '1.2',
            entries: []
        };

        if(parseTimer !== null) {
            clearTimeout(parseTimer);
            parseTimer = null;
        }

        if(now) {
            parse();
        }
        else {
            parseTimer = setTimeout(function() {
                parse();
                parseTimer = null;
            }, 1000);
        }
    }

    function runQuery(statement, escaped, compiled, debug) {
        var share = window.location.protocol + '//' + window.location.host + window.location.pathname + '?s=' + encodeURIComponent(statement);
        history.pushState(null, null, share);
        $('#copy-uri').unbind(); // unbind any previous registered handler.
        $('#copy-uri').click(function() {
            window.prompt('Copy the URI below',
                window.location.protocol + '//' + window.location.host + '/q?s=' + escaped);
        });
        $('#results').show();
        $('#results').animate({
            opacity: 0.25
        });

        if(wsEnabled) {
            try {
                doWs(statement, escaped, compiled, debug);
            }
            catch(e) {
                doXhr(statement, escaped, compiled);
            }
        }
        else {
            doXhr(statement, escaped, compiled);
        }
    }

    function doXhr(statement, escaped, compiled) {
        var mediaType, link, execState, data, x, i, status, event

        emitter = new EventEmitter();
        wireup(emitter);
        var url = '/q?s=' + escaped;
        url = subscribe(undefined, url);
        x = $.ajax({
            type: 'GET',
            processData: false,
            url: url,
            success: function(data) {
                data = x.responseText;
                mediaType = x.getResponseHeader('content-type');
                link = x.getResponseHeader('Link');
                if(link) {
                    link = headers.parse('Link', link);
                    execState = link.href;
                    if(execState.indexOf('data:application/json,') === 0) {
                        execState = execState.substring('data:application/json,'.length);
                        execState = decodeURIComponent(execState);
                        execState = JSON.parse(execState);
                        try {
                            for(i = 0; i < execState.length; i++) {
                                event = execState[i];
                                emitter.emit(event.type, event);
                            }
                        }
                        catch(e) {
                            alert(e);
                        }
                    }
                }
                if(mediaType === 'application/json') {
                    data = JSON.parse(data);
                    $('#results').attr('class', 'results tree json').html(formatter.jsonToHTML(data));
                    $('#results').treeview();
                }
                else if(mediaType === 'text/html') {
                    $('#results').attr('class', 'results html').html(data);
                }
                else {
                    $('#results').attr('class', 'results code json').text(data);
                }
                $('#results').animate({
                    opacity: 1.0
                });
            },
            error: function(req) {
                mediaType = x.getResponseHeader('content-type');
                if(mediaType == 'application/json') {
                    data = JSON.parse(req.responseText);
                    $('#results').attr('class', 'results tree json').html(formatter.jsonToHTML(data));
                    $('#results').treeview();
                }
                else if(mediaType === 'text/html') {
                    $('#results').attr('class', 'results').html(data);
                }
                else {
                    $('#results').attr('class', 'results code json').text(data);
                }
                $('#results').animate({
                    opacity: 1.0
                });
            }
        });
        markers.push(editor.setMarker(compiled[0].line - 1, '&#9992', 'red'));
    }

    function doWs(statement, escaped, compiled, debug) {
        var uri, packet;
        try {
            emitter = new EventEmitter();
            if (debug) {
                var packet = {
                    type: 'script',
                    data: '__debug__'+statement
                };
            }
            else {
                var packet = {
                    type: 'script',
                    data: statement
                };
            }
            if(socket === undefined || socket.readyState !== 1) {
                uri = 'ws://' + document.domain;
                uri = uri + ':' + (document.location.protocol === 'https:' ? 443 : document.location.port);
                var wsCtor = window['MozWebSocket'] ? MozWebSocket : WebSocket;
                socket = new wsCtor(uri, 'ql.io-console');
                socket.onopen = function () {
                    subscribe(socket);
                    socket.send(JSON.stringify(packet));
                };
            }
            else {
                socket.send(JSON.stringify(packet));
            }
            socket.onerror = function() {
                doXhr(statement, escaped, compiled);
            };
            socket.onmessage = function(e) {
                var event = JSON.parse(e.data);
                emitter.emit(event.type, event.data);
            };
            socket.onclose = function() {};
            wireup(emitter);
            emitter.on('script-result', function(data) {
                var contentType = data.headers && data.headers['content-type'];
                if(contentType === 'application/json') {
                    try {
                        $('#results').attr('class', 'results tree json').html(formatter.jsonToHTML(data.body));
                        $('#results').treeview();
                    }
                    catch(e) {
                        alert(e);
                    }
                }
                else if(contentType === 'text/html') {
                    $('#results').attr('class', 'results html').html(data.body);
                }
                else {
                    $('#results').attr('class', 'results code json').text(data.body);
                }
                $('#results').animate({
                    opacity: 1.0
                });
            });
        }
        catch(e) {
            alert(e);
        }
    }

    function buildErrorMessage(e) {
        return e.line !== undefined && e.column !== undefined
            ? 'Line ' + e.line + ', column ' + e.column + ': ' + e.message
            : e.message;
    }

    // Tell the server what notifications to receive
    function subscribe(socket, uri) {
        var events = ['ack', 'compile-error', 'statement-error', 'statement-in-flight',
            'statement-success', 'statement-request', 'statement-response', 'script-done', 'ql.io-debug'];
        var packet = {
            type: 'events',
            data: JSON.stringify(events)
        };
        if(socket) {
            return socket.send(JSON.stringify(packet));
        }
        else if(uri) {
            return uri + '&events=' +  JSON.stringify(packet);
        }
    }

    function probeWs(socket, cb) {
        var uri;
        try {
            uri = 'ws://' + document.domain;
            uri = uri + ':' + (document.location.protocol === 'https:' ? 443 : document.location.port);
            var wsCtor = window['MozWebSocket'] ? MozWebSocket : WebSocket;
            socket = new wsCtor(uri, 'ql.io-console');
            socket.onopen = function () {
                // Send a probe
                subscribe(socket);
            };

            socket.onerror = function() {
                cb('Not supported');
            };
            socket.onmessage = function() {
                cb();
            };
            socket.onclose = function() {
                cb('Not supported');
            };
        }
        catch(e) {
            cb('Not supported');
        }
    }

    function wireup(emitter) {
        var i, contentLength;
        emitter.on('statement-error', function (data) {
            markers.push(editor.setMarker(data.line - 1, data.elapsed + ' ms', 'red'));
        });
        emitter.on('statement-in-flight', function (data) {
            markers.push(editor.setMarker(data.line - 1, '&#9992', 'in-progress'));
        });
        emitter.on('statement-request', function (data) {
            var key = data.line + '';
            var entry = {
                line: key,
                id: data.id,
                startedDateTime: data.start,
                request: {
                    method: data.method,
                    url: data.uri,
                    headers: data.headers,
                    postData: {
                        text: data.body
                    }
                }
            };
            har.entry(data.id, entry);
        });
        emitter.on('statement-response', function (data) {
            contentLength = data.body.length; // This is post text decoding - hence not accurate.
            for(i = 0; i < data.headers.length; i++) {
                if(data.headers[i].name === 'content-length') {
                    contentLength = parseInt(data.headers[i].value);
                    break;
                }
            }
            har.response(data.id, {
                status: data.status,
                statusText: data.statusText,
                headers: data.headers,
                bodySize: contentLength,
                content: {
                    text: data.body
                }
            });
            har.timings(data.id, data.timings);
        });
        emitter.on('statement-success', function (data) {
            if (emitterID) {
                markers.push(editor.setMarker(data.line - 1, '&#8226', 'green'));
            }
            else {
                markers.push(editor.setMarker(data.line - 1, data.elapsed + ' ms', 'green'));
            }
        });
        emitter.on('ql.io-debug', function (data) {
            emitterID = data.emitterID;
            var context = data.context;
            context._step = step++;
            $('#results').attr('class', 'results tree json').html(formatter.jsonToHTML(context));
            $('#results').treeview();
            $('#results').animate({
                opacity: 1.0
            });
        });
        emitter.on('script-done', function (data) {
            markers.push(editor.setMarker(data.line - 1, data.elapsed + ' ms', 'green'));
        });
    }

    function killPrevEvent() {
        if (!emitterID || socket === undefined || socket.readyState !== 1) {
            return;
        }
        var packet = {
            type : 'kill',
            id : emitterID
        };
        socket.send(JSON.stringify(packet));
    }

    function pastePic(forest) {
        function getDepHelper(tree) {
            sofar = "";

            if (tree.hasOwnProperty('rhs')) {
                sofar += getDepHelper(tree.rhs);
            }
            var line_num = tree.line ? tree.line : 'return';
            if (tree.hasOwnProperty('fallback') && tree.fallback.dependsOn.length > 0) {
                var fallback = tree.fallback;
                for (var j = 0; j < fallback.dependsOn.length; j++) {
                    var addition = '%5B'+line_num+'%5D->%5Bnote:'+fallback.dependsOn[j].line+'%5D,';
                    sofar += addition;
                    sofar += getDepHelper(fallback.dependsOn[j]);
                }
            }
            if (tree.dependsOn && tree.dependsOn.length > 0) {
                for (var j = 0; j < tree.dependsOn.length; j++) {
                    var dep = tree.dependsOn[j];
                    var addition = '%5B'+line_num+'%5D-%3E%5B'+dep.line+'%5D,'
                    sofar += addition;
                    sofar += getDepHelper(dep);
                }
            }

            return sofar;
        }
        var deptxt = '';
        if (forest) {
            for (var k = 0; k < forest.length; k++) {
                deptxt += getDepHelper(forest[k]);
            }
            deptxt = 'http://yuml.me/diagram/scruffy;/class/'+deptxt.substring(0, deptxt.length-1)+'.png';
        }
        $('#dependencyMap').attr('src', deptxt);
    }
});
