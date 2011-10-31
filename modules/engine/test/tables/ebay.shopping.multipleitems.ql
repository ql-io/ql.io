create table ebay.shopping.item
  on select get from 'http://open.api.ebay.com/shopping?callname=GetMultipleItems&responseencoding={format}&appid={^apikey}&version=715&IncludeSelector={includeSelector}&ItemID={20|itemId}'
    with aliases json = 'JSON', xml = 'XML'
    using defaults format = 'JSON',
          apikey =  "{config.ebay.apikey}"
    resultset 'Item'
