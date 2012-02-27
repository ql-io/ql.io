/*
 * Copyright 2011 eBay Software Foundation
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

'use strict';

var eventTypes = require('./event-types.js'),
    uuid = require('node-uuid'),
    events = require("events"),
    util = require('util');

var LogEmitter = module.exports = function() {
    var counter = 1;
    events.EventEmitter.call(this);

    this.getEventId = function() {
        counter++;
        if (counter == 65535) {
            counter = 1; // skip 0, it means non-transaction
        }
        return counter;
    }

    this.beginEvent= function(parent, type, name) {
        return  {
            eventId: this.getEventId(),
            parentEventId: (parent ? parent.eventId = parent.eventId || 0 : 0),
            startTime: getUTimeInSecs(),
            tx: 'begin',
            type: type || 'QlIo',
            txType: type || 'QlIo',
            name: name || (type || 'QLIo'),
            txName: name || (type || 'QLIo'),
            uuid: (parent && parent.uuid ? parent.uuid : uuid())
        };
    }

    this.endEvent = function(obj) {
        if (!obj) {
            return; // don't waste my time
        }

        var startTime = obj.startTime || getUTimeInSecs();

        try {
            obj.txDuration = getUTimeInSecs() - startTime;
        }
        catch(Exception) {
            obj.txDuration = 0;
        }

        obj.type = obj.txType || 'QlIo';
        obj.name = obj.txName || obj.type;

        obj.tx = 'end';
    }

    this.wrapEvent = function(parent, txType, txName, cb) {
        var event = this.beginEvent(parent, txType, txName);
        this.emit(eventTypes.BEGIN_EVENT, event);
        var that = this;
        return {
            event: event,
            cb: function(e, r) {
                var message = 'Success';
                if (e) {
                    // TODO: This causes duplicate error events due to unwrapping ...
                    that.emit(eventTypes.ERROR, event, e);
                    message = 'Failure'
                }
                that.endEvent(event);
                that.emit(eventTypes.END_EVENT, event, message); //end
                return cb(e, r);
            }
        }
    }

    this.emitEvent = function(event, msg){
        this.emit(eventTypes.EVENT, event, msg);
    }

    this.emitWarning = function () {
        var event = {}, msg = 'Warning event raised without message';
        if (arguments.length > 1) {
            event = arguments[0];
            msg = arguments[1];
        }
        else if (arguments.length === 1) {
            msg = arguments[0];
        }
        this.emit(eventTypes.WARNING, event, msg);
    }

    this.emitError = function () {
        var event = {}, msg = 'Error event raised without message', cause;
        if (arguments.length > 1) {
            event = arguments[0];
            msg = arguments[1];
            if(msg.stack) {
                cause = msg;
                msg = msg.message;
            }
        }
        else if (arguments.length === 1) {
            msg = arguments[0];
        }
        this.emit(eventTypes.ERROR, event, msg, cause);
    }

    function getUTimeInSecs() {
        return Math.floor(new Date().getTime() / 1000);
    }
}

util.inherits(LogEmitter, events.EventEmitter);
