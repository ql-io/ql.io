
-- Example: select ShippingCostSummary from ebay.singleitem where includeSelector = 'Details, ShippingCosts,ItemSpecifics,Variations,Description' and itemId = '260770677131'

create table ebay.shopping.singleitem
  on select get from "http://open.api.ebay.com/shopping?callname=GetSingleItem&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={itemId}"
  with aliases xml = 'XML', json = 'JSON'
  using defaults format = "JSON", apikey = "{config.ebay.apikey}", limit = 10
  resultset 'Item'

