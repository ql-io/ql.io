-- Type ql script here - all keywords must be in lower case
item = select * from ebay.shopping.singleitem where itemId = '260852758792';
profile = select * from ebay.shopping.userprofile where includeSelector = "{selector}" and userId = "260852758792";
tradingItem = select * from ebay.trading.getitem where itemId = '260852758792';
bidders = select * from ebay.trading.getallbidders where itemId = '260852758792';
bestOffers = "Fixed Value";
return {
"user" : "{profile}",
"item" : "{item}",
"tradingItem" : "{tradingItem}",
"bidders" : "{bidders}",
"bestOffers" : "{bestOffers}"
} via route "/del/foo/bar/{selector}?userid={userId}" using method delete;