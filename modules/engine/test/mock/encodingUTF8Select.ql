
create table utf8Encoding 
  on select get from "http://localhost:3000/encodingUTF8.json";

return select * from utf8Encoding;

