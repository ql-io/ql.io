$(document).ready(function() {
    var oldInput, parseTimer, compiler, editor, markers = [], headers, mustache, split = false,
        runState = {}, socket, emitter, state, results, html, waitOnLoad = false,
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

    $("#trace-panel").hide();

    compiler = require('ql.io-compiler');
    headers = require('headers');
    mustache = require('mustache');

    var urlParams = {};
    (function () {
        var e,
            a = /\+/g,  // Regex for replacing addition symbol with a space
            r = /([^&=]+)=?([^&]*)/g,
            d = function (s) {
                return decodeURIComponent(s.replace(a, " "));
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
        onGutterClick: function(e, line) {
            state = runState[(line + 1) + ''];
            if(state) {
                if(!split) {
                    results = $('#results');
                    $('#results-placeholder').html($('#results-split-template').html());
                    $("#split-panel").splitter({
                        type: "v",
                        outline: true,
                        minRight: 10,
                        anchorToWindow: true,
                        accessKey: "T"
                    });
                    results.appendTo('#split-left');
                    split = true;
                }
                html = mustache.to_html($('#trace-template').html(), state);
                $('#trace-data').html(html);
            }
        },
        mode: "text/x-qlio"
    });

    $('#util-links').hide();
    oldInput = '-- Type ql script here - all keywords must be in lower case';

    scheduleParse();

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
        runState = {},split = false;
        $('#results-placeholder').html($('#results-normal-template').html());

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
            window.prompt("Copy the URI below",
                window.location.protocol + '//' + window.location.host + '/q?s=' + escaped);
        });
        $('#util-links').show();

        $('#results').animate({
            opacity: 0.25
        });
        var wsCtor = window['MozWebSocket'] ? MozWebSocket : WebSocket;
        if(typeof wsCtor !== 'undefined' && !Boolean(window.safari)) {
            try {
                doWs(statement, escaped, compiled);
            }
            catch(e) {
                doXhr(statement, esescaped, compiled);
            }
        }
        else {
            doXhr(statement, escaped, compiled);
        }
    }

    function doXhr(statement, escaped, compiled) {
        var mediaType, link, execState, data, x, i, status;

        $('#conn-status').html('Not connected. Use latest versions of Firefox or Chrome for better experience.');

        var url = '/q?s=' + escaped;
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
                            for(i = 0; i < compiled.length; i++) {
                                status = execState[compiled[i].line];
                                if(status) {
                                    if(status.status === 'ql-statement-error') {
                                        markers.push(editor.setMarker(compiled[i].line - 1, status.elapsed + ' ms', 'red'));
                                    }
                                    else if(status.status === 'ql.io-statement-success') {
                                        markers.push(editor.setMarker(compiled[i].line - 1, status.elapsed + ' ms', 'green'));

                                    }
                                }
                            }
                        }
                        catch(e) {
                            alert(e);
                        }
                    }
                }
                if(mediaType === 'application/json') {
                    data = JSON.parse(data);
                    $('#results').attr('class', 'results tree json').text(formatter.jsonToHTML(data));
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
                    $('#results').attr('class', 'results tree json').text(formatter.jsonToHTML(data));
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

    var events = ['ql.io-script-ack', 'ql.io-script-compile-error', 'ql.io-script-compile-ok',
        'ql.io-statement-error', 'ql.io-statement-in-flight', 'ql.io-statement-success',
        'ql.io-statement-request', 'ql.io-statement-response', 'ql.io-script-done'];
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
                    $('#conn-status').html('Connected. Click on the gutter to see request/response trace.');

                    // Tell the server what notifications to receive
                    packet = {
                        type: 'events',
                        data: JSON.stringify(events)
                    }
                    socket.send(JSON.stringify(packet));

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
                $('#conn-status').html('Not connected');
                doXhr(statement, escaped, compiled);
            }
            socket.onmessage = function(e) {
                var event = JSON.parse(e.data);
                emitter.emit(event.type, event.data);
            }
            socket.onclose = function() {
                $('#conn-status').html('Disconnected.');
            }
            emitter.on('ql.io-script-ack', function() {
            });
            emitter.on('ql.io-statement-error', function(data) {
                var state = JSON.parse(data);
                markers.push(editor.setMarker(state.line - 1, state.elapsed + ' ms', 'red'));
            });
            emitter.on('ql.io-statement-in-flight', function(data) {
                var state = JSON.parse(data);
                markers.push(editor.setMarker(state.line - 1, '&#9992', 'in-progress'));
            });
            emitter.on('ql.io-statement-request', function(data) {
                var req = JSON.parse(data);
                var key = req.line + '';
                runState[key] = runState[key] || {};
                runState[key].req = req;
                $("#trace-panel").show();
            });
            emitter.on('ql.io-statement-response', function(data) {
                var res = JSON.parse(data);
                var key = res.line + '';
                runState[key] = runState[key] || {};
                runState[key].res = res;
            });
            emitter.on('ql.io-statement-success', function(data) {
                var state = JSON.parse(data);
                markers.push(editor.setMarker(state.line - 1, state.elapsed + ' ms', 'green'));
            });
            emitter.on('ql.io-script-done', function(data) {
                var state = JSON.parse(data);
                markers.push(editor.setMarker(state.line - 1, state.elapsed + ' ms', 'green'));
            });
            emitter.on('ql.io-script-result', function(raw) {
                data = JSON.parse(raw);
                var body = data ? data.body : err.body;
                var contentType = data.headers && data.headers['content-type'];
                if(contentType === 'application/json') {
                    try {
                        $('#results').attr('class', 'results tree json').html(formatter.jsonToHTML(body));
                        $("#results").treeview();
                    }
                    catch(e) {
                        alert(e);
                    }
                }
                else if(contentType === 'text/html') {
                    $('#results').attr('class', 'results html').html(body);
                }
                else {
                    $('#results').attr('class', 'results code json').text(body);
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
});
