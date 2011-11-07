
create table ebay.ProductReviews
  on select get from "http://localhost:3000/ProductReviews-Merge-Block.json?ProductID.Value={#ProductID}"

return select * from ebay.ProductReviews where ProductID in ('99700122', '99700122', '99700122', '99700122', '99700122');
