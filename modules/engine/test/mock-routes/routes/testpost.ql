val = select * from testing.for.post;
return {
"val" : "{val}"
} via route "/ping/pong" using method post;