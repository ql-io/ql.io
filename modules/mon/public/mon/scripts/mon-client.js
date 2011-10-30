$(document).ready(function() {
    var wsCtor = window['MozWebSocket'] ? MozWebSocket : WebSocket;
    var currentMemoryUsage = [], hostCpu = [], pendingInRequests = [], pendingOutRequests = [];

    var uri = 'ws://' + document.domain;
    uri = uri + ':' + (document.location.protocol === 'https:' ? 443 : document.location.port);
    var socket = new wsCtor(uri, 'ql.io-mon');
    socket.onmessage = function(e) {
        var json;
        try {
            json = JSON.parse(e.data);
            $('#hostCpu').html(json.master.hostCpu);
            hostCpu.push(json.master.hostCpu);
            if(hostCpu.length > 120) {
                hostCpu = hostCpu.slice(1);
            }

            $('#currentMemoryUsage').html(json.master.currentMemoryUsage);
            currentMemoryUsage.push(json.master.currentMemoryUsage);
            if(currentMemoryUsage.length > 120) {
                currentMemoryUsage = currentMemoryUsage.slice(1);
            }

            var pendingOut = 0, pendingIn = 0;
            $('#averageLoad').html(json.master.averageLoad);
            for(var i = 0; i < json.workers.length; i++) {
                $('#connectionsTotal' + '-' + i).html(json.workers[i].connectionsTotal);
                $('#connectionsActive' + '-' + i).html(json.workers[i].connectionsActive);
                $('#requestsTotal-' + i).html(json.workers[i].requestsTotal);
                $('#totalProcMemoryWithSwap-' + i).html(json.workers[i].totalProcMemoryWithSwap);
                $('#totalProcMemoryWithoutSwap-' + i).html(json.workers[i].totalProcMemoryWithoutSwap);
                $('#memoryHeapAvailablToV8Engine-' + i).html(json.workers[i].memoryHeapAvailablToV8Engine);
                $('#memoryHeapUsedByV8Engine-' + i).html(json.workers[i].memoryHeapUsedByV8Engine);
                $('#inRequests-' + i).html(json.workers[i].inRequests);
                $('#outResponses-' + i).html(json.workers[i].outResponses);
                $('#outRequests-' + i).html(json.workers[i].outRequests);
                $('#inResponses-' + i).html(json.workers[i].inResponses);
                $('#activeInRequests-' + i).html(json.workers[i].inRequests - json.workers[i].outResponses);
                $('#activeOutRequests-' + i).html(json.workers[i].outRequests - json.workers[i].inResponses);
                pendingIn = pendingIn + json.workers[i].inRequests - json.workers[i].outResponses;
                pendingOut = pendingOut + json.workers[i].outRequests - json.workers[i].inResponses;
            }
            pendingInRequests.push(pendingIn);
            if(pendingInRequests.length > 120) {
                pendingInRequests = pendingInRequests.slice(1);
            }
            $('#master-in-pending').sparkline(pendingInRequests, { height: 100, width: 800, type:'bar', barColor:'red' });
            $('#master-pending-in-min').html(Math.min.apply(Math, pendingInRequests));
            $('#master-pending-in-max').html(Math.max.apply(Math, pendingInRequests));
            pendingOutRequests.push(pendingOut);
            if(pendingOutRequests.length > 120) {
                pendingOutRequests = pendingOutRequests.slice(1);
            }
            $('#master-out-pending').sparkline(pendingOutRequests, { height: 100, width: 800, type:'bar', barColor:'green' });
            $('#master-pending-out-min').html(Math.min.apply(Math, pendingOutRequests));
            $('#master-pending-out-max').html(Math.max.apply(Math, pendingOutRequests));
        }
        catch(e) {
            alert(e)
        }
    }

    function forMemoryNum(memory) {
        var strMemory;
        if(memory < 1024) {
            strMemory = memory + ' Bytes';
        }
        if(memory < 1024 * 1024) {
            strMemory = (memory / 1024).toFixed(2) + ' KB';
        }
        else {
            strMemory = (memory / (1024 * 1024)).toFixed(2) + ' MB';
        }
        return strMemory;
    }
});

