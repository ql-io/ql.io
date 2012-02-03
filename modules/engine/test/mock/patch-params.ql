
create table items
  on select get from "http://localhost:3000/PatchParams"
     using patch 'test/mock/patch-params.js'

return select * from items;
