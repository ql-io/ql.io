
create table items.rp
  on select get from "http://localhost:3000/FindItemsResponsePatch.json"
	using patch 'test/mock/response-patch.js'
	resultset 'findItemsByKeywordsResponse';

FindItemsByKeywordsResponse = select * from items.rp;
return "{FindItemsByKeywordsResponse.$..item}";
