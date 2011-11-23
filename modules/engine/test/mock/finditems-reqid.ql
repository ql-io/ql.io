-- This is used temporarily
create table items.rp
  on select get from "http://localhost:3000/FindItemsResponsePatch.json"
	using headers 'request-id' = 'my-own-request-id'
	resultset 'findItemsByKeywordsResponse';
FindItemsByKeywordsResponse = select * from items.rp;
return "{FindItemsByKeywordsResponse.$..item}";

