## Feb 21, 2012
* Bug fix for https://github.com/ql-io/ql.io/issues/286 for 0.3

## Feb 14, 2012
* XSS issue for 404 response fixed.

## Feb 13, 2012

* Propagate `connection.remoteAddress` to scripts and patches. Scripts can access this via
  `{remoteAddress}` and patches via `params.remoteAddress`.

## Jan 17, 2012

* [ql.io-compiler-0.3.1] Supported a wider range of characters in quoted words in statements.

## MISSING UPDATES
## Dec 16, 2011

- Clients can occasionally get socket hangup errors when origin servers close connections without
  sending a `Connection: close` header. See https://github.com/joyent/node/issues/1135 for some
  background. To avoid such errors, http.request.js now automatically retries the request once
  provided the statement that caused the HTTP request is a `select`.

- The engine can now consume CSV response in addition to XML and JSON.

- Fixed request body processing for routes (https://github.com/ql-io/ql.io/pull/161).


## Dec 08, 2011

- OAuth example (https://github.com/ql-io/ql.io/issues/121) - OAuth2 is trivial as ql.io proxies
 headers from clients to servers. OAuth1 requires glue code to compute the Authorization header.
 http://ql.io/docs/oauth shows an example of how to that.

- Use npm installed modules for ql.io-site (https://github.com/ql-io/ql.io/issues/116)

- Handle empty response bodies gracefully (https://github.com/ql-io/ql.io/issues/98)

- Recover from partial failures in case of scatter-gather calls
 (https://github.com/ql-io/ql.io/issues/90) - some statements can result in multiple HTTP requests.
 When this happens, the engine used to fail the entire statement if any of those requests fail. The
 engine now looks for success responses and aggregates them.

- Update CodeMirror to support line-wrapping (https://github.com/ql-io/ql.io/issues/11) - no need
 to split lines manually anymore.

## Nov 29, 2001

- Initial public release

