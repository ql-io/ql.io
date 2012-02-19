create table ejs.table on select post to 'http://localhost:3000'
    using defaults message = 'hello world'
    using bodyTemplate 'body.ejs' type 'application/json'