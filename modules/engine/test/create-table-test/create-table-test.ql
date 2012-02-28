
create table items
  on select get from "http://localhost:3000/"
  resultset 'findItemsByKeywordsResponse';

FindItemsByKeywordsResponse = select * from items;
return "{FindItemsByKeywordsResponse.$..item}";

