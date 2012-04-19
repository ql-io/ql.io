
create table defaultEncoding 
  on select get from "http://localhost:3000/encodingDefault.json";

return select * from defaultEncoding;

