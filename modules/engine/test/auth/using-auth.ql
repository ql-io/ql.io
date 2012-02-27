create table auth.plugin on select get from 'http://localhost:3000/'
    auth using './using-auth.js'
