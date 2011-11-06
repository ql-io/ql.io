-- This is used temporarily
create table ebay.finding.items
   on select get from 'http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.8.0&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&keywords={^keywords}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortOrder}'
                 with aliases format = 'RESPONSE-DATA-FORMAT', json = 'JSON', xml = 'XML'
                 using defaults format = 'JSON', globalid = 'EBAY-US', sortorder ='BestMatch',
                       apikey =  "{config.tables.ebay.finding.items.apikey}", limit = 10, pageNumber = 1
                 resultset 'findItemsByKeywordsResponse.searchResult.item'

-- Create a table. Rest of the details for the table will be filled through the patch.
create table mytable on select post to 'http://foo.com'
  using defaults format = "JSON", globalid = "EBAY-US", currency = "USD", itemSearchScope = "",
                 limit = 10, offset = 0, appid = "Qlio1a92e-fea5-485d-bcdb-1140ee96527"
  using patch 'dynamic-body-patch.js'
  resultset 'GetItemResponse.Item'

-- Create a table. Rest of the details for the table will be filled through the patch.
create table mytable.nourl on select post to 'http://foo.com'
  using defaults format = "JSON", globalid = "EBAY-US", currency = "USD", itemSearchScope = "",
                 limit = 10, offset = 0, appid = "Qlio1a92e-fea5-485d-bcdb-1140ee96527"
  using patch 'dynamic-body-patch-no-url.js'
  resultset 'GetItemResponse.Item'
