create table testing.for.xml.post
  on select post to "http://localhost:80126/ping/pong"
  using bodyTemplate "testpostXml.xml.mu" type 'application/xml'
