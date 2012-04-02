create table first on select get from "http://localhost:3026?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}"
using patch 'test/patches/ebay.finding.items.js'
resultset 'findItemsByKeywordsResponse.searchResult.item';

 return select title from first where keywords= "cooper" and FreeShippingOnly = "true" and MinPrice = "100" limit 10 offset 110;

