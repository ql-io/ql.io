
-- Create a table. Rest of the details for the table will be filled through the patch.
create table mytable on select post to 'http://foo.com'
  using defaults format = "JSON", globalid = "EBAY-US", currency = "USD", itemSearchScope = "",
                 limit = 10, offset = 0, appid = "Qlio1a92e-fea5-485d-bcdb-1140ee96527"
  using patch 'dynamic-body-patch.js'
  resultset 'GetItemResponse.Item'

-- Create a table. Rest of the details for the table will be filled through the patch.
create table mytable.nourl on select post to 'http://foo.com'
  using defaults format = "JSON", globalid = "EBAY-US", currency = "USD", itemSearchScope = "",
                 limit = 10, offset = 0, appid = "Qlio1a92e-fea5-485d-bcdb-1140ee96527"
  using patch 'dynamic-body-patch-no-url.js'
  resultset 'GetItemResponse.Item'
