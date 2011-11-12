
create table items
  on select get from "http://localhost:3000/FindItemsByKeywordsResponse.xml"
  resultset 'findItemsByKeywordsResponse';

FindItemsByKeywordsResponse = select * from items;
return "{FindItemsByKeywordsResponse.$..item}";

