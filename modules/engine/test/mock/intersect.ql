create table buying
  on select get from "http://localhost:3000/GetMyeBayBuyingResponse-Intersect.xml"
  resultset 'GetMyeBayBuyingResponse';

create table mi
  on select get from "http://localhost:3000/ItemDetails-Intersect.json";

GetMyeBayBuyingResponse = select * from buying;
wonList = "{GetMyeBayBuyingResponse.$..Transaction}";

GetMultipleItemsResponse = select * from mi;
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
          from wonList as w, itemDetails as d where w.Item.ItemID = d.ItemID;

return {
  "wonList": "{wonList.$..ItemID}",
  "won": "{won.$..itemId}"
}