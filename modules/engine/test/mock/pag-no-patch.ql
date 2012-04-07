
create table foo on select get from "http://localhost:3026?start={offset}&count={limit}";
return select * from foo limit 5 offset 10 ;
