This module provides a small URI template parser. ql.io uses URI templates for specifying URIs of APIs.

## Syntax Overview

Here is overview of the syntax.

1. Each template can have an arbitrary number of tokens enclosed in braces (`{` and `}`).

    http://myserver/somepath?p1={v1}&p2={v2}

2. You can generate URIs from URI templates by calling the `format()` function with an object containing values, and
   optionally, default values.

3. All tokens are optional and single valued by default.

4. You can mark that a token is required by prefixing the name of the token with `^`. When the value for a required
   token is missing, formatting will fail.

    http://myserver/somepath?p1={^v1}&p2={v2}

5. You can also mark that a token is multi-valued by prefixing the name of the token with a `|`.

    http://myserver/somepath?p2={|v2}

If the value of `v2` is `['v2_1','v2_2']`, calling the `format()` would result in

    http://myserver/somepath?p2=v2_1,v2_2

Some APIs may not take more than a given number of values. In such cases, you can specify a maximum
integer before `|`.

    http://myserver/somepath?p1={^v1}&p2={5|v2}

If you supply more than 5 values, the `format()` function will return `Math.ceil(n/5)` URIs.

## Version History

### 10/23/2011 v0.2.6

* Launch