a = 1;
b = "Hello world";
obj = {
  "a" : "{a}",
  "b" : "{b}",
  "p2" : {
      "p3" : "v3",
      "p4" : "v4"
  }
};
p2 = "{obj.p2}";
p4 = select p4 from p2;
return p4;
