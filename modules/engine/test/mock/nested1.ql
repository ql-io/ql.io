create table buying
  on select get from "http://localhost:3000/GetMyeBayBuyingResponse1.xml"
  resultset 'GetMyeBayBuyingResponse';

create table selling
  on select get from "http://localhost:3000/GetMyeBaySellingResponse1.xml"
  resultset 'GetMyeBaySellingResponse';

create table itemdetails
  on select get from "http://localhost:3000/ItemDetails1.json";

GetMyeBayBuyingResponse = select * from buying;
GetMyeBaySellingResponse = select * from selling;
wonList = "{GetMyeBayBuyingResponse.WonList.OrderTransactionArray.OrderTransaction}";
soldList = "{GetMyeBaySellingResponse.SoldList.OrderTransactionArray.OrderTransaction}";
watchList = "{GetMyeBayBuyingResponse.WatchList.ItemArray.Item}";
unsoldList = "{GetMyeBaySellingResponse.UnsoldList.ItemArray.Item}";

GetMultipleItemsResponse = select * from itemdetails;

itemDetails = "{GetMultipleItemsResponse.Item}";

won = select d.ItemID as itemId, d.Title as title, w.Transaction.Item.BiddingDetails.MaxBid.$t as userMaxBid,
          w.Transaction.Item.SellingStatus.HighBidder.UserID as highBidderId, w.Transaction.Item.SellingStatus.HighBidder.FeedbackScore as highBidderFeedbackScore,
          w.Transaction.Item.WatchCount as numWatching, w.Transaction.Item.ConvertedMaxBid.$t as convertedMaxBid, w.Transaction.Item.ConvertedMaxBid.currencyID as convertedMaxBidCurrency,
          d.TimeLeft as timeLeft, d.Seller.UserID as sellerUserId, d.Seller.PositiveFeedbackPercent as sellerFeedbackPercent,
          d.Seller.FeedbackScore as sellerFeedbackRating, d.ListingType as listingFormat, d.CurrentPrice.Value as currentPrice,
          d.CurrentPrice.CurrencyID as currency, d.ConvertedCurrentPrice.Value as convertedCurrentPrice,
          d.ConvertedCurrentPrice.CurrencyID as convertedCurrentPriceCurrency, d.Country as country, d.StartTime as startTime,
          d.EndTime as endTime, d.PictureURL as imageUrl, d.GalleryURL as thumbnailUrl,
          d.HitCount as pageViews, d.BuyItNowAvailable as hasBuyItNow, d.BuyItNowPrice.Value as buyItNowPrice,
          d.ConvertedBuyItNowPrice.Value as convertedBuyItNowPrice, d.ConvertedBuyItNowPrice.CurrencyID as convertedBuyItNowPriceCurrency,
          d.BidCount as numBids, d.ReserveMet as reserveMet, d.ShipToLocations as shipToLocations,
          d.ShippingCostSummary.ListedShippingServiceCost as shippingCost, d.ShippingCostSummary.ShippingType as shippingType,
          d.Quantity as quantity, d.QuantitySold as quantitySold, d.BestOfferEnabled as bestOfferEnabled,
          w.Transaction.Item.BestOfferDetails.BestOffer.$t as bestOffer, w.Transaction.Item.BestOfferDetails.BestOffer.currencyID as bestOfferCurrency,
          w.Transaction.Item.BestOfferDetails.BestOfferStatus as bestOfferStatus, w.Transaction.Item.BestOfferDetails.ConvertedBestOffer.$t as convertedBestOffer,
          w.Transaction.Item.BestOfferDetails.ConvertedBestOffer.currencyID as convertedBestOfferCurrency, w.Transaction.Item.BestOfferDetails.BestOfferCount as bestOfferCount
          from wonList as w, itemDetails as d where w.Transaction.Item.ItemID = d.ItemID;

sold = select d.ItemID as itemId, d.Title as title, s.Transaction.Item.BiddingDetails.MaxBid.$t as userMaxBid,
          s.Transaction.Item.SellingStatus.HighBidder.UserID as highBidderId, s.Transaction.Item.SellingStatus.HighBidder.FeedbackScore as highBidderFeedbackScore,
          s.Transaction.Item.WatchCount as numWatching, s.Transaction.Item.ConvertedMaxBid.$t as convertedMaxBid, s.Transaction.Item.ConvertedMaxBid.currencyID as convertedMaxBidCurrency,
          d.TimeLeft as timeLeft, d.Seller.UserID as sellerUserId, d.Seller.PositiveFeedbackPercent as sellerFeedbackPercent,
          d.Seller.FeedbackScore as sellerFeedbackRating, d.ListingType as listingFormat, d.CurrentPrice.Value as currentPrice,
          d.CurrentPrice.CurrencyID as currency, d.ConvertedCurrentPrice.Value as convertedCurrentPrice,
          d.ConvertedCurrentPrice.CurrencyID as convertedCurrentPriceCurrency, d.Country as country, d.StartTime as startTime,
          d.EndTime as endTime, d.PictureURL as imageUrl, d.GalleryURL as thumbnailUrl,
          d.HitCount as pageViews, d.BuyItNowAvailable as hasBuyItNow, d.BuyItNowPrice.Value as buyItNowPrice,
          d.ConvertedBuyItNowPrice.Value as convertedBuyItNowPrice, d.ConvertedBuyItNowPrice.CurrencyID as convertedBuyItNowPriceCurrency,
          d.BidCount as numBids, d.ReserveMet as reserveMet, d.ShipToLocations as shipToLocations,
          d.ShippingCostSummary.ListedShippingServiceCost as shippingCost, d.ShippingCostSummary.ShippingType as shippingType,
          d.Quantity as quantity, d.QuantitySold as quantitySold, d.BestOfferEnabled as bestOfferEnabled,
          s.Transaction.Item.BestOfferDetails.BestOffer.$t as bestOffer, s.Transaction.Item.BestOfferDetails.BestOffer.currencyID as bestOfferCurrency,
          s.Transaction.Item.BestOfferDetails.BestOfferStatus as bestOfferStatus, s.Transaction.Item.BestOfferDetails.ConvertedBestOffer.$t as convertedBestOffer,
          s.Transaction.Item.BestOfferDetails.ConvertedBestOffer.currencyID as convertedBestOfferCurrency, s.Transaction.Item.BestOfferDetails.BestOfferCount as bestOfferCount
          from soldList as s, itemDetails as d where s.Transaction.Item.ItemID = d.ItemID;

watches = select d.ItemID as itemId, d.Title as title, w.BiddingDetails.MaxBid.$t as userMaxBid
          from watchList as w, itemDetails as d where w.ItemID = d.ItemID;

unsold = select d.ItemID as itemId, d.Title as title, u.BiddingDetails.MaxBid.$t as userMaxBid
          from unsoldList as u, unsoldItemDetails as d where u.ItemID = d.ItemID;

return {
  "GetMyeBayBuyingResponse": "{GetMyeBayBuyingResponse}",
  "GetMyeBaySellingResponse": "{GetMyeBaySellingResponse}",
  "itemDetails": "{itemDetails}",
  "wonList": "{wonList}",
  "soldList": "{soldList}",
  "watchList": "{watchList}",
  "unsoldList": "{unsoldList}",
  "won": "{won}",
  "sold": "{sold}",
  "watches": "{watches}",
  "unsold": "{unsold}"
}