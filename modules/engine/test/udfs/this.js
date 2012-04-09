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

exports.checkThis = function() {
    var row = {};
    row.a1 = this.a1 !== null || this.a1 !== undefined;
    row.a2 = this.a2 !== null || this.a2 !== undefined;
    row.u = this.u !== null || this.u !== undefined;
    row.next = this.next !== null || this.next !== undefined;
    row.row = this.row !== null || this.row !== undefined;

    return this.next(null, row);
}