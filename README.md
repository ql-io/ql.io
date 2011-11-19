
ql.io is a a data-retrieval and aggregation gateway to make orchestrating across HTTP APIs (from
SOAP-style to RESTful) as simple as SQL and JSON.

See [ql.io](http://ql.io) for docs, demos and examples.

To build ql.io on your own, you need node (version 4.x) and npm. Once you have these set up, do the
following:

    git clone git@github.com:ql-io/ql.io.git
    cd ql.io
    make install

If you are interested in using ql.io as a stand-alone server, setup a new ql.io app and start the
server.

**TODO: This step will change once the repo is public**

    git clone https://github.com/ql-io/ql.io-template myapp
    cd myapp
    make
    bin/start.sh

Using latest versions of Firefox or Chrome, go to
[href="http://localhost:3000](http://localhost:3000) to see ql.io's Web Console. See the
[Quickstart Guide](http://ql.io/docs/quickstart) for more details.</p>

If you are interested in using ql.io in your node app, use

    # Does not work yet
    npm install ql.io-engine

After that you can simply execute the core engine.

    var Engine = require('../lib/engine');
    var engine = new Engine({
        tables: ... path to tables ...
    });
    engine.exec('your script here', function(err, res) {
       // process error or results
    });
