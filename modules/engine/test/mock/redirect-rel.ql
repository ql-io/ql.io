create table redirect 
  on select get from "http://127.0.0.1:8300/rel/redirect-response.json"
response = select * from redirect;

return response;
