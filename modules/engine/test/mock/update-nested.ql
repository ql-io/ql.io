obj = [
    {
      "id" : 1,
      "prop" : {
          "id" : 100001
      }
    },
    {
      "id" : 2,
      "prop" : {
          "id" : 100002
      }
    },
    {
          "id" : 3,
          "prop" : {
              "id" : 100001
          }
    }
];
update obj set prop.id = 3 where prop.id = 100001
return obj;
