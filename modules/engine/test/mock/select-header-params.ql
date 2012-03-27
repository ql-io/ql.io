

create table first on select get from 'http://localhost:3000/select-header-fill.json' using headers 'Foo' = '{foo}' using defaults foo = 'foo-default';

select * from first where keywords = 'ferrari' limit 1