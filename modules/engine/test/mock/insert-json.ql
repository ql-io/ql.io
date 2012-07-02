
create table insertjson
  on insert post to "http://localhost:3000/FindItemsByKeywordsResponse.xml"
  using patch '/test/mock/forIncMkyPatchErr.js'
  resultset 'findItemsByKeywordsResponse';

return select * from items;
