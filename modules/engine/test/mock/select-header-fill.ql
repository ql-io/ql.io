create table first on select get from 'http://localhost:3000/select-header-fill.json' using headers 'Foo' = '{foo}';
return select * from first where keywords = 'ferrari' and foo = 'BAR' limit 1