userprofile = select * from ebay.shopping.userprofile where MessageID = '{messageid}' and IncludeSelector = '{includeselector}' and userId = '{userID}'
return userprofile via route '/profile?messageid={messageid}&include={includeselector}&userid={userID}'
using defaults userID = 'myjewelryboxstore'
using method get