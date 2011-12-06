
create table items
  on select get from "http://localhost:3000/FindItemsByKeywordsResponse.xml"
  resultset 'findItemsByKeywordsResponse';

return select * from items;
