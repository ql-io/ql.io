create table proxy
  on select get from "http://127.0.0.1:3000/proxy-response.json"

response = select * from proxy;

return response;