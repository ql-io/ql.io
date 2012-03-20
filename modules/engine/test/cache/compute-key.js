/*
 * Copyright 2012 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _ = require('underscore');

/* By providing this function the user is choosing to forego default key computation and provide a custom one */
exports['compute key'] = function(args) {
    //return args.uri;
    var key = [];
    key.push(args.table);
    key.push(args.uri);
    key.push(JSON.stringify(args.params));
    key.push(JSON.stringify(_.chain(args.headers)
        .keys()
        .without("connection","user-agent","accept","accept-encoding","request-id")
        .reduce(function(obj,header){
            obj[header] = args.headers[header];
            return obj;
        },{})
        .value()));
    return(key.join(':'));
};

