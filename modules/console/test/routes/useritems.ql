item = select * from ebay.shopping.singleitem where itemId = '{itemId}';
profile = select * from ebay.shopping.userprofile where includeSelector = "{selector}" and userId = "{userId}";
tradingItem = select * from ebay.trading.getitem where itemId = '{itemId}';
bidders = select * from ebay.trading.getallbidders where itemId = '{itemId}';
bestOffers = select * from ebay.trading.bestoffers where itemId = '{itemId}';
-- Sample request: http://localhost:3000/foo/bar/Details?userid=sallamar&itemid=260852758792
return {
"user" : "{profile}",
"item" : "{item}",
"tradingItem" : "{tradingItem}",
"bidders" : "{bidders}",
"bestOffers" : "{bestOffers}"
} via route "/foo/bar/{selector}?userid={userId}&itemid={itemId}" using method get;