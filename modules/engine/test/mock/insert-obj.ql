obj = {
  "p1" : "v1",
  "p2" : {
      "p3" : "v3",
      "p4" : "v4",
      "p7" : {}
  }
};
p2 = "{obj.p2}";
insert into p2 (p7.p5, p6) values ('v5', 'v6')
return obj;
