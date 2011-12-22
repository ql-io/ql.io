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
            $.each(json.master.workers, function(i, worker) {
                $('#connectionsTotal' + '-' + i).html(worker.connectionsTotal);
                $('#connectionsActive' + '-' + i).html(worker.connectionsActive);
                $('#requestsTotal-' + i).html(worker.requestsTotal);
                $('#inRequests-' + i).html(worker.inRequests);
                $('#outResponses-' + i).html(worker.outResponses);
                $('#outRequests-' + i).html(worker.outRequests);
                $('#inResponses-' + i).html(worker.inResponses);
                $('#activeInRequests-' + i).html(worker.inRequests - worker.outResponses);
                $('#activeOutRequests-' + i).html(worker.outRequests - worker.inResponses);
                pendingIn = pendingIn + worker.inRequests - worker.outResponses;
                pendingOut = pendingOut + worker.outRequests - worker.inResponses;
            });

            $('#inRequests').html(json.master.inRequests);
            $('#outResponses').html(json.master.outResponses);
            $('#outRequests').html(json.master.outRequests);
            $('#inResponses').html(json.master.inResponses);

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

