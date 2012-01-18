
[![ql.io](http://ql.io/images/ql.io-large.png)](http://ql.io)

ql.io is a declarative, data-retrieval and aggregation gateway for quickly consuming HTTP APIs. See
[ql.io](http://ql.io) for docs, demos and examples.

![Travis status](https://secure.travis-ci.org/ql-io/ql.io.png)

## How to Build ql.io

To build ql.io on your own, you need node (version 0.6.0 or later) and npm. In Ubuntu, you need
libexpat-dev additionally. Once you have these set up, do the following:

    git clone git://github.com/ql-io/ql.io.git
    cd ql.io
    make install

**Note** If you get "ERR! Error: EACCES, Permission denied" errors, please take a look 
at [npm issue #194](https://github.com/isaacs/npm/issues/194) and 
[what-no-sudo](http://foohack.com/2010/08/intro-to-npm/#what_no_sudo).

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

    mkdir myapp
    cd myapp
    curl https://raw.github.com/ql-io/ql.io/master/modules/template/init.sh | bash
    bin/start.sh

Using latest versions of Firefox or Chrome, go to
[http://localhost:3000](http://localhost:3000) to see ql.io's Web Console. See the
[Quickstart Guide](http://ql.io/docs/quickstart) for more details.</p>

## Using ql.io in a Node App

If you are interested in using ql.io in your node app, use

    npm install ql.io-engine

After that you can simply execute the core engine.
    
    var Engine = require('ql.io-engine');
    var engine = new Engine({
        connection: 'close'
    });

    var script = "create table geocoder " +
                 "  on select get from 'http://maps.googleapis.com/maps/api/geocode/json?address={address}&sensor=true' " +
                 "     resultset 'results.geometry.location'" +
                 "select lat as lattitude, lng as longitude from geocoder where address='Mt. Everest'";

    engine.execute(script, function(emitter) {
        emitter.on('end', function(err, res) {
            console.log(res.body[0]);
        });
    });

## Making Contributions

Fixes and features via pull requests are welcome as long as the contributor agrees to the
[Contributor License Agreement](https://github.com/downloads/ql-io/ql.io/ql.io-CLA.pdf). Print,
sign, and email a scanned copy to subbu/AT/ebaysf/DOT/com before submitting the first pull request.

To help move pull requests quickly, consider socializing your idea in the
[email group](http://groups.google.com/group/qlio).

## Discussions

Subscribe to the [google group](http://groups.google.com/group/qlio). 
