create table payload1 on select get from "http://localhost:3000/reqidtest1.json"


create table payload2 on select get from "http://localhost:3000/reqidtest2.json"


one = select * from payload1 where keywords = "ferrari" limit 1;
two = select * from payload2 where keywords = "bmw" limit 1;
return select o.title[0], t.title[0] from one as o, two as t where o.country[0] =  t.country[0] ;