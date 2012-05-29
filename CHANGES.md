## May 29, 2012

* Explicit dependencies between modules.

## May 25, 2012

* Update the context with the udf filtered data

## May 22, 2012

* Add fallback syntax to the language

## May 20, 2012

* Version 0.6

## May 18, 2012

* Support array style reference in columns clause, such as `select 'b-1', 'b-3'['c-1'] from a`.
* Disable ability to enable/disable ecv checks by default. You can turn it on by adding arg
   `--ecvControl true` to the start script.

## May 17, 2012

* Add optional parameters in route. Including "with optional params" in route would make params
  without ^ prefix optional.
* Add more test cases, some bug fix in app.js to fully support defaults.

## May 15, 2012

* Be able to start on multiple ports (separated by commas)
* Added support for multiple attachments.

## May 14, 2012

* Support larger than 1mb data in local-mem-cache.

## May 8, 2012

* Moved maxNestedRequests warning out of the _.each loop in select.js

## May 3, 2012

* Add support for multipart requests.

## Apr 27, 2012

* End pending connections on close after responses are written.
* Support cache events (hit, miss, new, error, info, heartbeat)

## Apr 26, 2012

* Switch to new cluster2

## Apr 25, 2012

* Added new syntaxes "with part" and opaque insert param.

## Apr 24, 2012

* Add a null check on join loop
* Fix expression parsing in string template so that a token like `"{obj.prop[?(@.price > 2)]}"` is
  valid

## Apr 20, 2012

* Add support for escaped quotes in string values

## Apr 19, 2012

* Updated PEG.js to 0.7. I see 50% improvement in speed which matters for string and uri templates
  as we don't yet cache parser output.
* Remove duplicates from in clause. 
* Use hasOwnProperty in place of prop lookup while joining

## Apr 18, 2012

* Deal with non UTF-8 encodings from upstream resources

## Apr 17, 2012

* When joining, use '==' to maintain backwards compat

## Apr 16, 2012

* Minor cleanup of event names and classes to make the API less specific.

## Apr 15, 2012

* Refactor logging to error, access, proxy and default logs. The proxy log file contains outgoing
  req/resp, access log contains incoming requests, error log contains all errors and warnings,
  and the rest go to ql.io.log. All these files are rotated.

## Apr 13, 2012

* Include a payload with begin events

## Apr 12, 2012

* Support local offset and limit

## Apr 11, 2012

* Cleanup logging (first phase)
* Fix the case of alias names with joins and UDFs.

## Apr 08, 2012

* Support null values in Values

## Apr 07, 2012

* Fix the issue posted in https://groups.google.com/forum/?fromgroups#!topic/qlio/JaMC1GVP1sA.
* Add UDFs in where clause to post process rows. You can either tweak or remove a row. See
  https://gist.github.com/2334012 for semantics of UDFs. UDF support for the where clause is
  still a TODO.

## Apr 02, 2012

* Experimental UDF support.

## Mar 30, 2012

* Release version 0.5.

## Mar 29, 2012

* Fix regression in uri-template formatter (https://github.com/ql-io/ql.io/issues/409).

## Mar 28, 2012

* Upgrade cluster2, and also pass ecvPath to cluster2
* Fix issue 404
* Cache config param for cache provider changed from cache.name to cache.impl
* If cache provider not found with the given token then try to find it relative to "node_modules" of process.cwd().

## Mar 25, 2012

* Add `using headers` clause on return statements. Here is an example.

    return 'hello' via route '/hello' using method get
        using headers 'Cache-Control' = 'max-age=3600'

## Mar 22, 2012

* Externally supply Cache to engine through config.
* Logging Enhancements. Lot of bugs fixed in hierarchical logging.

## Mar 21, 2012

* Fix https://github.com/ql-io/ql.io/issues/329.
* Compression support for ql.io clients. Responses for routes are compressed as per
  'accept-encoding' header. gzip and deflate are supported. Default is gzip.

## Mar 20, 2012

* Factor out cluster function into [cluster2](https://github.com/ql-io/cluster2). This change
  also moves ECV checks to cluster2.
* Caching support based on new `expires <seconds>` keyword ***create table*** (example below). `compute key` monkey patch to generate custom keys.

**create table**

create table auto.compute.key on select get from 'http://a.uri.net' ..other things .. `expires 10`;

**compute key** (monkey patch)

	exports['compute key'] = function(args) {
    	//return args.uri;
	    var key = [];
    	key.push(args.table);
	    key.push(args.uri);
    	key.push(JSON.stringify(args.params));
	    return(key.join(':'));
	};	

## Mar 19, 2012

* Remove extraneous event emitted while processing the where clause.

## Mar 18, 2012

* Fix https://github.com/ql-io/ql.io/issues/372.

## Mar 16, 2012

* Upgrade CodeMirror to 2.22

## Mar 15, 2012

* logging support in monkey patches. Ex.
      exports['patch body'] = function(args) {
          var log = args.log;
          log('error', 'Something went wrong'); // throws an error event
          log('warn', 'Watch out'); // throws a warning event
          return {};
      }
* Fix the broken template app

## Mar 12, 2012

* Fix route to table dependency resoluton for non-selects
* Remame `/routes` to `/api`
* Restyle routes and tables navigation

## Mar 10, 2012

* Fix "Can't render headers after they are sent to the client" error

## Mar 09, 2012

* Support DELETE statements

## Mar 07, 2012

* Add a page showing all installed packages. Try http://<host>:<monport>/deps
  (or http://localhost:3001/deps).
* There are many conventions to convert xml to json. If the default xml2json does not work you, you
  can override it on table by table basis. To override, specify path to an xformers.json file. Here
  is an example.
      {
          "some.table" : "modulename relative to process.cwd() or a module from NODE_PATH"
      }

## Mar 06, 2012

* Gzip and Deflate content encoding support for upstream responses.

## Mar 05, 2012

* Recover shutdown/stop from extraneous pid files.

## Mar 02, 2012

* Simplify response decoding. In stead of setting encoding on the response, collect buffers into
  array, and then decode in the default impl of 'parse response'. Also add tests.
* Removed /in-flight requests api.

## Feb 28, 2012

* mkdir logs dir if not present when initing the console
* Enable numbers in `in` clause and args of udfs

## Feb 27, 2012

* Refactor request processing - add more tests.

## Feb 26, 2012

* Refactor request processing - this work is in progress.
* Bug https://github.com/ql-io/ql.io/issues/286 reopened and fixed with better tests.

## Feb 24, 2012

* Escalte table/route loading errors to the logger

## Feb 22, 2012

* Export version from each module. You can find version of the engine using
  `require('ql.io-engine').version`.
* Include version number in `User-Agent` and `Server` headers.

## Feb 19, 2012

* Support scatter-gather for requests with bodies by adding a `foreach 'param'` for the
  `using bodyTemplate` cluase. This allows scripts to batchup POST and PUT requests.
* Support ejs body templates.

## Feb 16, 2012

* Skip files that don't end with `.ql`.
* Fixed minor formatting issues with /table?name=<tablename> html rendering.
* With /table?name=<tablename> feature 'describe table <tablename>' returns json in console.
* Changed the query param for json in /routes, /tables, /route, /table from json=true to format=json.
* Bug fix for https://github.com/ql-io/ql.io/issues/286

## Feb 14, 2012

* "/ecv" check returns network ip instead of loopback address
* Let the engine allow a monkey patch to parse the response. Useful to process binary formats
  like avro.
* HTML interface for `/routes` and `/tables`. You can get JSON by either include
  `Accept: application/json` or query param `json=true`.

## Feb 13, 2012

* Downgrade nodeunit
* Version 0.4
* Propagate `connection.remoteAddress` to scripts and patches. Scripts can access this via
  `{remoteAddress}` and patches via `params.remoteAddress`.
* Handling 404s and sanitizing the returned url avoiding XSS issue.

## Feb 10, 2012

* Set `application/json` on JSON responses.
* Fix signal handling in the app module.
* Update har-view to show total time.

## Feb 03, 2012

* Ip address is retrieved using os.networkInterfaces().
* '/ecv' poke '/tables', instead of '/q?s=show%20tables".
* Send resourceUri, statement, params to `patch status`, `patch uri`, and `patch response`.
* Due to a previous change, `validate params` was not receiving all params. Fixed now.

## Feb 02, 2012

* Fix to make Routes case sensitive 
* Type concercion during xml2json

## Feb 01, 2012

* Report start of the statement and not the end for line numbers in the console
* Remove mistakenly added debug: true in app.js
* New config parameter 'enable q', a boolean, is added to console to disable '/q?s=' way of invoking scripts.

## Jan 31, 2012

* Improve support for in-proc selection and joins. If the RHS is multi-valued, selection is ORed.
  Multiple conditions are ANDed ('and' === and).

## Jan 25, 2012

* Support for extended xml content-types returned  per rfc: http://www.ietf.org/rfc/rfc3023.txt
* Also better handling of unrecognized content-types.

## Jan 22, 2012

* Integrate HAR view (https://github.com/s3u/har-view) replacing the vanilla tree view.

## Jan 18, 2012

* Re-integrate ECV

## Jan 17, 2012

* Limit response size to 10000000 bytes from upstream sources. You can change this with
  `maxResponseLength` in the config.
* Limit outgoing requests per statement to 50. You can change this with `maxRequests` in the config.
* Chain events for logging done with log-emitter.
* Add a new JSON based interface to browse tables and routes. Try `/routes` to start browsing.
* Move from cluster module to the native cluster.
* Refresh all dependencies.
* Change node.js dependency to 0.6.x.

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

