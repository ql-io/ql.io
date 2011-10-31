create table ebay.finding.category
  on select get from "http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByCategory&SERVICE-VERSION={^version}&GLOBAL-ID={globalid}&SECURITY-APPNAME={apikey}&RESPONSE-DATA-FORMAT={format}&REST-PAYLOAD&categoryId={^categoryId}&affiliate.customId={customId}&affiliate.networkId={networkId}&affiliate.trackingId={trackingId}&buyerPostalCode={^zip}&MaxDistance={distance}&paginationInput.entriesPerPage={limit}&paginationInput.pageNumber={pageNumber}&outputSelector%280%29=SellerInfo&sortOrder={sortorder}"
     with aliases format = "RESPONSE-DATA-FORMAT", xml = "XML", json = "JSON"
     using defaults format = "XML", globalid = "EBAY-US", sortorder = "BestMatch",
            apikey = "{config.ebay.apikey}",
            limit = 10, pageNumber = 1, version = "1.9.0"
     using patch 'ebay.finding.category.js'
     resultset "findItemsByCategoryResponse.searchResult.item"
