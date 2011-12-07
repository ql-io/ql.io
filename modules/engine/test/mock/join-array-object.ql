items = [
 {
  "id" : 1,
  "name": "one"
 },
 {
  "id" : 2,
  "name" : "two"
 }
];
details = [
 {
  "id" : 1,
  "detail": "This is one"
 },
 {
  "id" : 2,
  "detail" : "This is two"
 }
];

detail = {
 "id" : 1,
 "detail": "This is one"
};

j1 = select i.id, i.name, d.detail from items as i, details as d where i.id = d.id;
j2 = select i.id, i.name, d.detail from items as i, detail as d where i.id = d.id;

-- j1 should have two, j2 should have one element.
return {
"j1": "{j1}",
"j2": "{j2}"
}
