
create table csvTable
  on select get from "http://localhost:3000/utf-8-demo.csv";

return select * from csvTable;

