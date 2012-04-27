-- This URL maps to eBay.trading.UploadSiteHostedPictures.
-- Gets detail of a want it now post
return insert into ebay.trading.UploadSiteHostedPictures (ExternalPictureURL) values ('{pic}') with part '{part}'
via route '/ebay/trading/uploadpicparts?pic={pic}&part={part}' using method get;