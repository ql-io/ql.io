create table ebay.trading.bestoffers
  on select post to "https://api.ebay.com/ws/api.dll?appid={^appid}&version=723"
     using headers 'Content-Type'= 'application/xml; charset=UTF-8',
                   'X-EBAY-API-SITEID'= '0',
                   'X-EBAY-API-COMPATIBILITY-LEVEL'= '723',
                   'X-EBAY-API-CALL-NAME'= 'getBestOffers',
                   'X-EBAY-API-APP-NAME'= '{config.tables.ebay.trading.bestoffers.appname}',
                   'X-EBAY-API-DEV-NAME'= '{config.tables.ebay.trading.bestoffers.devname}',
                   'X-EBAY-API-CERT-NAME'= '{config.tables.ebay.trading.bestoffers.certname}'
     using defaults format = 'JSON', lang= 'en_US', limit = 10, offset = 0,
                    eBayAuthToken = '{config.tables.ebay.trading.bestoffers.eBayAuthToken}',
                    appid = 'SubbuAll-5dfd-458a-9c9e-76e0aebe845f'
     using bodyTemplate 'getbestoffers.xml.mu' type 'application/xml'

