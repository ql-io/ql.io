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

exports['udf'] = function() {
    return {
        'p1' : function(v1) {
            return v1
        },
        'p2' : function(a, b) {
            return Number(a) + Number(b);
        }
    };
};

exports['patch uri'] = function(args) {
    args.uri.removeParam('p1');
    args.uri.addParam('P1', args.params.p1);
    args.uri.removeParam('p2');
    args.uri.addParam('P2', args.params.p2);
    return args.uri;
}
