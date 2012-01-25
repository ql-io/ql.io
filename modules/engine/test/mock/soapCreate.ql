
create table items
  on select get from "http://localhost:3000/SoapFindItemsByKeywordsResponse.xml"
  resultset 'soap:Envelope.soap:Body.findItemsByKeywordsResponse';

FindItemsByKeywordsResponse = select * from items;
return "{FindItemsByKeywordsResponse.$..item}";

