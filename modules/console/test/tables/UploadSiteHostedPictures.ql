-- Example: insert into ebay.trading.UploadSiteHostedPictures (ExternalPictureURL) values("http://developer.ebay.com/DevZone/XML/docs/images/hp_book_image.jpg")
--
create table ebay.trading.UploadSiteHostedPictures
  on insert post to "{config.tables.ebay.trading.sandbox.gateway}"
     using headers 'X-EBAY-API-COMPATIBILITY-LEVEL' = '{config.tables.ebay.trading.version}',
                   'X-EBAY-API-SITEID' = '{config.tables.ebay.trading.siteid}',
                   'X-EBAY-API-CALL-NAME'= 'UploadSiteHostedPictures'
      using defaults RequesterCredentials.eBayAuthToken = '{config.tables.ebay.trading.sandbox.eBayAuthToken}'
      using bodyTemplate 'UploadSiteHostedPictures.ejs' type 'application/xml'
      resultset 'UploadSiteHostedPicturesResponse'