
create table foos
  on select get from "http://localhost:3000/foo?p1={p1}";

return select * from foos;
