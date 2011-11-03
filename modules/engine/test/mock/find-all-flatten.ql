create table buying
  on select get from "http://localhost:3000/GetMyeBayBuyingResponse2.xml"
  resultset 'GetMyeBayBuyingResponse';

GetMyeBayBuyingResponse = select * from buying;
return "{GetMyeBayBuyingResponse.$..Item}";
