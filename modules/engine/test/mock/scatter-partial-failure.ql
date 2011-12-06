
create table state
  on select get from "http://localhost:3000/{^mode}";

list = ["ok", "fail"];

return select * from state where mode in ("{list}");