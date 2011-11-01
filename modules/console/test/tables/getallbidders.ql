
create table ebay.trading.getallbidders
  on select post to "https://api.ebay.com/ws/api.dll?appid={^appid}&version=723"
     using headers 'Content-Type'= 'application/xml; charset=UTF-8',
                   'X-EBAY-API-SITEID'= '0',
                   'X-EBAY-API-COMPATIBILITY-LEVEL'= '723',
                   'X-EBAY-API-APP-NAME'= '{config.tables.ebay.trading.bestoffers.appname}',
                   'X-EBAY-API-DEV-NAME'= '{config.tables.ebay.trading.bestoffers.devname}',
                   'X-EBAY-API-CERT-NAME'= '{config.tables.ebay.trading.bestoffers.certname}',
                   'X-EBAY-API-CALL-NAME'= 'getAllBidders'
      using defaults format = "JSON", globalid = "EBAY-US", currency = "USD", itemSearchScope = "",
                     lang= "en_US", limit = 10, offset = 0, appid = "SubbuAll-5dfd-458a-9c9e-76e0aebe845f"
      using bodyTemplate "getallbidders.xml.mu" type 'application/xml'
