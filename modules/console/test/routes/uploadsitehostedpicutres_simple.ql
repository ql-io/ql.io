-- This URL maps to eBay.trading.UploadSiteHostedPictures.
-- Gets detail of a want it now post
return insert into ebay.trading.UploadSiteHostedPictures (ExternalPictureURL) values ('{pic}')
via route '/ebay/trading/uploadpic?pic={pic}' using method get;