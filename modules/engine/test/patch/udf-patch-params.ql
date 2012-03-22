create table udf.patch.params
    on select get from "http://localhost:3000/q?testValue={testValue}"
    using patch "udf-patch-params.js"
