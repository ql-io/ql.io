create table ebay.finding.items
   on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'
       with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'
       using defaults format = 'XML', globalid = 'EBAY-US', sortorder ='BestMatch',
             apikey =  "{config.ebay.apikey}", limit = 10, pageNumber = 1
       using patch 'ebay.finding.items.js'
       resultset 'findItemsByKeywordsResponse.searchResult.item'
