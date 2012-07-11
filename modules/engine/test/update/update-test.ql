create table test.update
    on update post to 'http://localhost:3000/'
        using bodyTemplate 'update.mu' type 'application/json'

