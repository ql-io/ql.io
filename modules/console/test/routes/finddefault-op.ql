result = select itemId from finditems where keywords = '{^keyword}' and limit = '{limit}'
return result via route '/finddefault?kw={^keyword}&limit={limit}'
with optional params
using defaults limit = 1
using method get
