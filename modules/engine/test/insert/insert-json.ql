create table insert.json
    on insert put to 'http://localhost:3000/'
        using bodyTemplate 'insert-json.mu' type 'application/xml'
