
create table items
  on select get from "http://localhost:3000/FindItemsByKeywordsResponse.xml"
  using patch '/test/mock/forIncMkyPatchErr.js'
  resultset 'findItemsByKeywordsResponse';

return select * from items;
