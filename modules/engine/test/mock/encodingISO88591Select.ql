
create table iso88591Encoding 
  on select get from "http://localhost:3000/encodingISO88591.json";

return select * from iso88591Encoding;

