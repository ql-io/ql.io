a = 1;
b = "Hello world";
obj = {
  "p1" : "v1",
  "p2" : {
      "p3" : "v3",
      "p4" : "v4"
  }
};
p3 = "{obj.p2.p3}";
p4 = select p2.p4 from obj;
return "Done";
