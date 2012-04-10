--Example: select * from ebay.shopping.GetUserProfile where UserID = 'ryantindall'
create table ebay.shopping.GetUserProfile
  on select get from "http://open.api.ebay.com/shopping?callname=GetUserProfile&appid={^apikey}&responseencoding=JSON&version=765&siteid={^siteid}&MessageID={MessageID}&IncludeSelector={IncludeSelector}&UserID={^UserID}"
  using defaults MaxEntries = "5", siteid = 'EBAY-US', apikey = "{config.tables.ebay.shopping.appid}", version = '{config.tables.ebay.shopping.version}'
  using patch 'basic.js'
  resultset 'User';