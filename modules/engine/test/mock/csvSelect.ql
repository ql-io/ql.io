
create table csvTable
  on select get from "http://localhost:3000/smallSample.csv";

return select * from csvTable;

