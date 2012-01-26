
create table plusxml
  on select get from "http://localhost:3000/test";

aResponse = select * from plusxml;
return "{aResponse}";

