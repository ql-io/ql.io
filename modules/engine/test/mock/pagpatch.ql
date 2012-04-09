create table foo on select get from "http://localhost:3026?&count={limit}&pageNumber={pageNumber}"
using patch 'test/patches/pagination.js'
return select * from foo limit 5 offset 10 ;
