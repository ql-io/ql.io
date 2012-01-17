
create table ebay.shopping.userprofile
  on select get from "http://open.api.ebay.com/shopping?callname=GetUserProfile&responseencoding={format}&appid={^apikey}&version=721&IncludeSelector={includeSelector}&UserID={userId}"
      using defaults format = "JSON", apikey = "{config.ebay.apikey}", limit = 10


