val = select * from testing.for.xml.post;
return {
"val" : "{val}"
} via route "/ping/pongxml" using method post;