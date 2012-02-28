create table insert.into
    on insert put to 'http://localhost:3000/'
        using bodyTemplate 'insert-into.json.mu' type 'application/json'
