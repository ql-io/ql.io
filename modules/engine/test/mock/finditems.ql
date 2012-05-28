-- This is used temporarily
create table items.rp
  on select get from "http://localhost:3000/FindItemsResponsePatch.json"
	resultset 'findItemsByKeywordsResponse.searchResult.item';
return select * from items.rp;
