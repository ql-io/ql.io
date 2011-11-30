
[![ql.io](http://ql.io/images/ql.io-large.png)](http://ql.io)

ql.io is a declarative, data-retrieval and aggregation gateway for quickly consuming HTTP APIs. See
[ql.io](http://ql.io) for docs, demos and examples.

## How to Build ql.io

To build ql.io on your own, you need node (version 0.4.12) and npm. Support for node 0.6.x is
coming soon. Once you have these set up, do the following:

    git clone git@github.com:ql-io/ql.io.git
    cd ql.io
    make install

These steps will link ql.io modules locally so can you refer to those modules from your apps using
`npm link`.

To run tests

    make test

ql.io source is organized into several modules that you can test independently.

    cd modules/engine
    make test

## Using ql.io as a Stand-Alone Server

If you are interested in using ql.io as a stand-alone server, setup a new ql.io app and start the
server.

**TODO: This step will change once the repo is public**

    git clone https://github.com/ql-io/ql.io-template myapp
    cd myapp
    make
    bin/start.sh

Using latest versions of Firefox or Chrome, go to
[http://localhost:3000](http://localhost:3000) to see ql.io's Web Console. See the
[Quickstart Guide](http://ql.io/docs/quickstart) for more details.</p>

## Using ql.io in a Node App

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

## Making Contributions

We're working on getting a CLA in place.

## Discussions

Subscribe to the [google group](http://groups.google.com/group/qlio).