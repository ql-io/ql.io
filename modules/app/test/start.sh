#!/bin/bash

node bin/ql.io-app.js --cluster --port 3036 --monPort 3037 --tables $PWD/tables/ --routes $PWD/routes/ --config $PWD/config/dev.json $@
