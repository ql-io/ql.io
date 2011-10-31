create table buying
  on select get from "http://localhost:3000/GetMyeBayBuyingResponse3.xml"
  resultset 'GetMyeBayBuyingResponse';

create table itemDetails
  on select get from "http://localhost:3000/ItemDetails3.json";

GetMyeBayBuyingResponse = select * from buying;
be1 = select Errors from GetMyeBayBuyingResponse;
be2 = "{GetMyeBayBuyingResponse.Errors}";

GetMultipleItemsResponse = select * from itemDetails;
me1 = select Errors from GetMultipleItemsResponse;
me2 = "{GetMultipleItemsResponse.Errors}";

return {
  "be1" : "{be1}",
  "be2" : "{be2}",
  "me1" : "{me1}",
  "me2" : "{me2}"
}