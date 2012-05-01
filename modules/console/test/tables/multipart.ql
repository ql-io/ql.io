-- Example: insert into multipart.test.table (desc) values("test image")

create table multipart.test.table
  on insert post to "http://localhost:4000/upload"
     using headers 'X-EBAY-API-COMPATIBILITY-LEVEL' = '42', 'X-EBAY-API-SITEID' = '0'
     using defaults desc = 'test image'
     using bodyTemplate 'multipart.xml.mu' type 'application/xml'
     resultset 'MultipartTestResponse'
