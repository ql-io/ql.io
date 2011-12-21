create table proxy.item
  on select post to 'http://localhost:3000/proxy'
    using bodyTemplate 'post.txt' type 'application/x-www-form-urlencoded'
    resultset 'Item'

