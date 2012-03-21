create table patch.compute.key on select get from 'http://localhost:3000'
    using patch 'compute-key.js'
