
=======
# Misc

* ,,,,,,,,,,application/xml,application/json,text/csv
* X-Started-Since
* Include app's version number if available
* On the site: paste a create table with patch - does not show error!
* null and undefined args in udf
* array of null/undefined in udf args
* What does UDF in where mean for select *?

# Compiler

* --ql.peg cleanup for JSONPath --
* -- udf in where clause --
* -- udf in columns clause --
* -- udf in columns clause with alias --
* columns as column udf args
* --column udfs in joins--
* --literal args for col udfs--
* --literal args for where udfs--

# Runtime

## require udfs

* --This is the first step--
* Modules must be relative to the process.cwd() for now.

## Where Clause UDF

Goal is to support

    udfs = require('./udfs/example.js');
    a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},
          {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},
          {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];
    a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},
          {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];
    return select a2.name from a1 as a1, a2 as a2 where a1.name = a2.name and udfs.applyDiscount("{a1.keys...name}");

* Filter select *
* --Filter select fields--
* --Filter select fields with alias--
* --Evaluate args--
* --Short-circuit where clause UDFs when there are no UDFs in the where clause--
* Change where udf for the new syntax - backwards compat?
* Support columns udf
* Support columns extras in columns udf args

* where clause UDFs on deletes

# Tests

## where udf

* select star to modify body
* select star to remove body
* select start multiple times

* Test UDF on rhs
* Test UDF in return statements
