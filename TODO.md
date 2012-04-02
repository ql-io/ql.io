# Compiler

* ql.peg cleanup for JSONPath - remove unused
* -- udf in where clause --
* -- udf in columns clause --
* -- udf in columns clause with alias --
* columns as column udf args
* --column udfs in joins--
* --literal args for col udfs--
* literal args for where udfs

# Runtime

## Where Clause UDF

Goal is to support

    a1 = [{"name": "Brand-A", "keys" : [{ "name": "G1"},{"name": "G2"},{"name": "G3"}]},
          {"name": "Brand-B", "keys" : [{ "name": "G1"},{"name": "G2"}]},
          {"name": "Brand-C", "keys" : [{ "name": "G4"},{"name": "G2"}]}];
    a2 = [{"name": "Brand-A", "details": [{"name": "G3","count": 32},{"name": "G5","count": 18}]},
          {"name": "Brand-C", "details": [{"name": "G3","count": 32}, {"name": "G5","count": 18}]}];
    return select a2.name from a1 as a1, a2 as a2 where a1.name = a2.name and f1(a1.keys..name);

* Evaluate args

* Change where udf for the new syntax - backwards compat?
* Support columns udf
* Support columns extras in columns udf args

# Tests

* Test UDF on rhs
* Test UDF in return statements
* Expressions in JSONPath


