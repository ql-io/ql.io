-- this route is very similar to getuserprofile
result = select itemId from finditems where keywords = '{^keyword}'
return result via route '/profile?kw={^keyword}&messageid={messageid}&include={includeselector}&userid={userid}'
with optional params
using method get