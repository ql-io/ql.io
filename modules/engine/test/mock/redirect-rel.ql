create table redirect 
  on select get from "http://127.0.0.1:8300/redirect-response.json"
  using headers 'redirect-test' = 'true'
response = select * from redirect;

return response;
