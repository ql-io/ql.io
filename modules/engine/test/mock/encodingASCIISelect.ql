
create table asciiEncoding 
  on select get from "http://localhost:3000/encodingASCII.json";

return select * from asciiEncoding;

