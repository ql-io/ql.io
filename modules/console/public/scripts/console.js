$(document).ready(function() {
    var oldInput, parseTimer, compiler, editor, markers = [], headers, mustache,
        runState, socket, emitter, state, results, html, waitOnLoad = false, wsEnabled,
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
        $("#top-pane").width("99%");
        $("#bottom-pane").width("100%");
        $(".hsplitbar").width("100%");
    });
    // Splitter to show har data
    $("#splitter").splitter({
        splitHorizontal: true,
        resizeTo: window,
        sizeBottom: true
    });

    compiler = require('ql.io-compiler');
    headers = require('headers');
    mustache = require('mustache');

    var urlParams = {};
    (function () {
        var e,
            a = /\+/g,  // Regex for replacing addition symbol with a space
            r = /([^&=]+)=?([^&]*)/g,
            d = function (s) {
                return decodeURIComponent(s.replace(a, ' '));
            },
            q = window.location.search.substring(1);

        while(e = r.exec(q)) {
            urlParams[d(e[1])] = d(e[2]);
        }
    })();
    waitOnLoad = urlParams['wait'] != undefined;

    editor = CodeMirror.fromTextArea(document.getElementById('query-input'), {
        lineNumbers: true,
        matchBrackets: true,
        indentUnit: 4,
        onChange: function() {
            scheduleParse();
        },
        mode: 'text/x-qlio'
    });

    $('#util-links').hide();
    oldInput = '-- Type ql script here - all keywords must be in lower case';

    probeWs(socket, function(e, r) {
        wsEnabled = !e;
        scheduleParse();
    });

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
                $('#run-query').show();
                $('#parse-status').hide();

                // Run it now
                runQuery(statement, escaped, compiled);
            }
        }
        catch (e) {
            $('#parse-status').show();
            $('#parse-status').text(buildErrorMessage(e));
            var result = false;
        }
        return result;
    }

    function scheduleParse(now) {
        // If the uri includes a param 'wait' don't schedule it immediately
        if(waitOnLoad) {
            var statement = editor.getValue().replace(/\uFEFF/g, '');
            var share = window.location.protocol + '//' + window.location.host + window.location.pathname + '?s=' + encodeURIComponent(statement);
            $('#run-again').attr('href', share);
            $('#run-again').text('run');
            $('#util-links').show();
            waitOnLoad = false;
            return;
        }

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
        }

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

    function runQuery(statement, escaped, compiled) {
        var share = window.location.protocol + '//' + window.location.host + window.location.pathname + '?s=' + encodeURIComponent(statement);
        $('#run-again').attr('href', share);
        $('#copy-uri').unbind(); // unbind any previous registered handler.
        $('#copy-uri').click(function() {
            window.prompt('Copy the URI below',
                window.location.protocol + '//' + window.location.host + '/q?s=' + escaped);
        });
        $('#util-links').show();

        $('#results').animate({
            opacity: 0.25
        });
        if(wsEnabled) {
            try {
                doWs(statement, escaped, compiled);
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

        $('#conn-status').html('Use latest versions of Firefox or Chrome for better experience.');

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

    function doWs(statement, escaped, compiled) {
        var data, uri, packet;
        try {
            emitter = new EventEmitter();
            if(socket === undefined || socket.readyState !== 1) {
                uri = 'ws://' + document.domain;
                uri = uri + ':' + (document.location.protocol === 'https:' ? 443 : document.location.port);
                var wsCtor = window['MozWebSocket'] ? MozWebSocket : WebSocket;
                socket = new wsCtor(uri, 'ql.io-console');
                socket.onopen = function () {
                    subscribe(socket);
                    var packet = {
                        type: 'script',
                        data: statement
                    }
                    socket.send(JSON.stringify(packet));
                };
            }
            else {
                packet = {
                    type: 'script',
                    data: statement
                }
                socket.send(JSON.stringify(packet));
            }
            socket.onerror = function() {
                doXhr(statement, escaped, compiled);
            }
            socket.onmessage = function(e) {
                var event = JSON.parse(e.data);
                emitter.emit(event.type, event.data);
            }
            socket.onclose = function() {
            }
            wireup(emitter);
            emitter.on('ql.io-script-result', function(data) {
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
        var events = ['ql.io-script-ack', 'ql.io-script-compile-error', 'ql.io-script-compile-ok',
            'ql.io-statement-error', 'ql.io-statement-in-flight', 'ql.io-statement-success',
            'ql.io-statement-request', 'ql.io-statement-response', 'ql.io-script-done'];
        var packet = {
            type: 'events',
            data: JSON.stringify(events)
        }
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
            }
            socket.onmessage = function(e) {
                cb(undefined);
            }
            socket.onclose = function() {
                cb('Not supported');
            }
        }
        catch(e) {
            cb('Not supported');
        }
    }

    function wireup(emitter) {
        emitter.on('ql.io-statement-error', function (data) {
            markers.push(editor.setMarker(data.line - 1, data.elapsed + ' ms', 'red'));
        });
        emitter.on('ql.io-statement-in-flight', function (data) {
            markers.push(editor.setMarker(data.line - 1, '&#9992', 'in-progress'));
        });
        emitter.on('ql.io-statement-request', function (data) {
            var key = data.line + '';
            var entry = {
                line: key,
                id: data.id,
                startDateTime: data.start,
                request: {
                    method: data.method,
                    url: data.uri,
                    headers: data.headers,
                    body: data.body
                }
            }
            runState.entries.push(entry);

            $('#har').attr('class', 'results tree json').html(formatter.jsonToHTML(runState.entries));
            $('#har').treeview();
        });
        emitter.on('ql.io-statement-response', function (data) {
            var key = data.id;
            var entry;
            for(var i = 0; i < runState.entries.length; i++) {
                if(runState.entries[i].id === key) {
                    entry = runState.entries[i];
                    break;
                }
            }
            entry.time = data.time;
            entry.response = {
                status: data.status,
                headers: data.headers,
                body: data.body
            }
            $('#har').attr('class', 'results tree json').html(formatter.jsonToHTML(runState.entries));
            $('#har').treeview();
        });
        emitter.on('ql.io-statement-success', function (data) {
            markers.push(editor.setMarker(data.line - 1, data.elapsed + ' ms', 'green'));
        });
        emitter.on('ql.io-script-done', function (data) {
            markers.push(editor.setMarker(data.line - 1, data.elapsed + ' ms', 'green'));
        });
    }
});
