#!/bin/bash
#
# Copyright 2011 eBay Software Foundation
#
# Use this script to initialize the app
#
# You can run this in a new directory by
#
# curl "https://raw.github.com/ql-io/ql.io/master/modules/template/init.sh" | sh
#
git clone https://git@github.com:ql-io/ql.io-template.git ql.io-template
mv ql.io-template/* .
mv ql.io-template/.gitignore .
rm -rf ql.io-template
git init
make install

