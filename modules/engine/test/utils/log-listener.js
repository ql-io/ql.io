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

 // Use nodeunit to run this
var _ = require('underscore'),
    Engine = require('../../lib/engine'),
    util = require('util');

String.prototype.repeat = function(n) {
    return new Array(1 + n).join(this);
}

var LogListener = module.exports = function(emitter) {
    this.debug = false;
    var depth = 0;
    if(arguments.length === 2) {
        this.debug = arguments[1];
    }

    this.events = [];
    var self = this;
    function log(event, message) {
        if(event.tx === 'end') {
            depth = depth - 2;
        }
        if(self.debug) {
            var type = event.tx === 'begin' ? '+' : (event.tx === 'end' ? '-' : '*');
            console.log(' '.repeat(depth) + type + event.type + ' ' + event.name + ' ' + util.inspect(message, false, 10));
        }
        if(event.tx === 'begin') {
            depth = depth + 2;
        }
        if(event.tx === 'begin') {
            self.events.push(event);
        }
        else if(event.tx === 'end') {
            assert(self.events.length > 0);
            self.events.pop();
        }
    }

    emitter.on(Engine.Events.BEGIN_EVENT, function(event, message) {
        log(event, message);
    });

    emitter.on(Engine.Events.END_EVENT, function(event, message) {
        log(event, message);
    });

    emitter.on(Engine.Events.HEART_BEAT, function(event, message) {
        log(event, message);
    });

    emitter.on(Engine.Events.EVENT, function(event, message) {
        log(event, message);
    });

    emitter.on(Engine.Events.WARNING, function(event, message) {
        log(event, message);
    });

    emitter.on(Engine.Events.ERROR, function(event, message) {
        log(event, message);
    });
};

var assert = require('assert');
LogListener.prototype.assert = function(test) {
    test.equals(this.events.length, 0,
        'If you see this assertion fail, set debug = true in log-listener.js and run the test again.');
}