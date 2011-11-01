create table testing.for.post
  on select post to "http://localhost:80126/ping/pong"
  using bodyTemplate "testpost.xml.mu" type 'application/xml'
