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

exports['patch body'] = function(args) {
    var log = args.log;

    log('error', 'Something went wrong');
    log('warn', 'Watch out');
    log('info', 'Something to note');

    return {
        type: 'application/json',
        content: JSON.stringify({message : 'ok'})
    };
}