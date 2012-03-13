create table patch.udf.uri on select get from 'http://localhost:3000/?p1={p1}&p2={p2}'
    using patch 'udf-patch-uri.js'
