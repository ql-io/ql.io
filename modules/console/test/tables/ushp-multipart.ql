-- Example: insert into upload.site.hosted.pictures
-- http://eazye.qa.ebay.com/ws/api.dll
create table upload.site.hosted.pictures
  on insert post to "http://eazye.qa.ebay.com/ws/api.dll"
     using headers
      'X-EBAY-API-COMPATIBILITY-LEVEL' = '745',
      'X-EBAY-API-DEV-NAME' = 'urn:ebay-marketplace-devid:df9d8b8c-d406-403e-857a-b3a49d9e902e',
      'X-EBAY-API-APP-NAME' = 'urn:ebay-marketplace-consumerid:c87a61a3-1940-44eb-a0b0-f86bc71a5443',
      'X-EBAY-API-CERT-NAME' = 'e9455295-7c01-41e6-8f57-d91c686687f1',
      'X-EBAY-API-CALL-NAME' = 'UploadSiteHostedPictures',
      'X-EBAY-API-SITEID' = '0'
     using bodyTemplate 'ushp-multipart.xml.mu' type 'multipart/form-data'
     resultset 'UploadSiteHostedPicturesResponse'
