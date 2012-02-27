create table auth.plugin on select get from 'http://localhost:3000/?p1={p1}&p2={p2}'
    auth using './using-auth.js'
