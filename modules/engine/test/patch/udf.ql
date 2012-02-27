create table patch.udf on select get from 'http://localhost:3000/?p1={p1}&p2={p2}'
    using patch 'udf.js'
