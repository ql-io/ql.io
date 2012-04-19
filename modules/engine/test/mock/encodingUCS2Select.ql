
create table ucs2Encoding 
  on select get from "http://localhost:3000/encodingUCS2.json";

return select * from ucs2Encoding;

