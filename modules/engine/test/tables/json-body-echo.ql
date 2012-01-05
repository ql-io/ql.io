create table jsonbody
  on select post to "http://localhost:3000"
  using bodyTemplate "jsonbody.json.mu" type "application/json"