
create table remoteip
    on select post to 'http://localhost:5000'
        using bodyTemplate 'remote-ip.json.mu' type 'application/json'
