obj = [
    {
      "name" : "John",
      "age" : 34
    },
    {
      "name" : "Mary",
      "age" : 16
    }
];
update obj set age = 99 where name = 'Mary'
return obj;
