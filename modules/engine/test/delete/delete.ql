create table delete.test
    on delete delete 'http://localhost:3000/'
        using bodyTemplate 'delete.json.mu' type 'application/json'
