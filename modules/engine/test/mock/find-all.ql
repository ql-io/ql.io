
create table buying
  on select get from "http://localhost:3000/GetMyeBayBuyingResponse2.xml"
  resultset 'GetMyeBayBuyingResponse';

create table selling
  on select get from "http://localhost:3000/GetMyeBaySellingResponse2.xml"
  resultset 'GetMyeBaySellingResponse';

create table itemdetails
  on select get from "http://localhost:3000/ItemDetails-Nested.json";

GetMyeBayBuyingResponse = select * from buying;
GetMyeBaySellingResponse = select * from selling;

GetMultipleItemsResponse  = select * from itemdetails where itemId in
    ("{GetMyeBayBuyingResponse.$..ItemID}", "{GetMyeBaySellingResponse.$..ItemID}");

i1 = "{GetMyeBayBuyingResponse.$..ItemID}";
ids = "{GetMultipleItemsResponse.$..ItemID}";

txb = "{GetMyeBayBuyingResponse.$..OrderTransaction}";
txs = "{GetMyeBaySellingResponse.$..OrderTransaction}";

return {
  "i1": "{i1}",
  "i2": "{GetMyeBaySellingResponse.$..ItemID}",
  "ids": "{ids}",
  "txb": "{txb}",
  "txs": "{txs}"
}