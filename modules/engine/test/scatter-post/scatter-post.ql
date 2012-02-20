create table scatter.post on select post to 'http://localhost:3000'
    using bodyTemplate 'body.ejs' type 'application/json' foreach 'id';