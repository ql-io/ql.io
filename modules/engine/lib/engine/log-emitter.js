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
    _ = require('underscore'),
    uuid = require('node-uuid'),
    events = require("events"),
    util = require('util');

/**
 * The point of this emitter is to capture events in a hierarchy so know which part of the script
 * caused what HTTP request.
 */
var LogEmitter = module.exports = function() {
    events.EventEmitter.call(this);

    /**
     * This begins a new event and returns an event object
     *
     * The arg is an object with the following properties:
     *
     * - parent: Parent event, if nested.
     * - clazz: class of the event, such as 'info', 'warn', 'error'
     * - type: Type of the event
     * - name: Name of the event
     * - message: A message payload
     * - cb: A function to callback when this event ends
     *
     * This function returns an object with event and cb properties. Invoking this cb ends this
     * event and triggers invocation of the original callback.
     *
     * @return {Object}
     */
    this.beginEvent = function() {
        var parent = arguments[0].parent;
        var type = arguments[0].type;
        var name = arguments[0].name;
        var message = arguments[0].message;
        var cb = arguments[0].cb;

        var event = {
            eventId: getEventId(),
            parentEventId: (parent ? parent.eventId = parent.eventId || 0 : 0),
            startTime: Date.now(),
            clazz: 'begin',
            type: type || 'ql.io',
            name: name || 'ql.io',
            uuid: (parent && parent.uuid ? parent.uuid : uuid()),
            tid: (parent && parent.tid ? parent.tid : Math.random()) // nodejs does not has multiple threads. the tid would trick Cal to consider calls in different threads.
        };

        this.emit(eventTypes.BEGIN_EVENT, event, message);
        var that = this;
        return {
            event: event,
            cb: function(e, r, m) {
                var message = {status : 'Success'};
                if (e) {
                    if(e.emitted === undefined) {
                        event.clazz = 'error';
                        that.emit(eventTypes.ERROR, event, e);
                        e.emitted = true;
                    }
                    message.status = 'Failure'
                }
                that.endEvent(event, m || message);
                return cb(e, r);
            },
            error: function(err) {
                that.emitError(event, err);
            },
            end: function(err, results, m) {
                that.emit('end', err, results);
                var message = {status : 'Success'};
                if(err) {
                    if(err.emitted === undefined) {
                        event.clazz = 'error';
                        that.emitError(event, err);
                        err.emitted = true;
                    }
                    message.status = 'Failure'
                }
                that.endEvent(event, m || message);
                return cb(err, results);
            }
        }
    }

    /**
     * Ends the event
     */
    this.endEvent = function(event, message) {
        if (!event) {
            return; // don't waste my time
        }

        var startTime = event.startTime || getUTimeInSecs();

        try {
            event.duration = Date.now() - startTime;
        }
        catch(e) {
            event.duration = 0;
        }

        event.clazz = 'end';

        this.emit(eventTypes.END_EVENT, event, message); //end
    }

    /**
     * Emits an event
     */
    this.emitEvent = function(){
        var event, msg;
        if(arguments.length === 1) {
            event = {
                clazz: 'info'
            };
            msg = arguments[0];
        }
        else if(arguments.length === 2) {
            event = arguments[0];
            msg = arguments[1];
        }
        this.emit(eventTypes.EVENT, event, msg);
    }

    /**
     * Emits a warning
     */
    this.emitWarning = function () {
        var event = {}, msg = 'Warning event raised without message';
        if (arguments.length > 1) {
            event = arguments[0];
            msg = arguments[1];
        }
        else if (arguments.length === 1) {
            msg = arguments[0];
        }
        event.clazz = 'warn';
        this.emit(eventTypes.WARNING, event, msg);
    }

    /**
     * Emits an error
     */
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
            if(msg.stack) {
                cause = msg;
                msg = msg.message;
            }
        }
        event.clazz = 'error';
        this.emit(eventTypes.ERROR, event, msg, cause);
    }

    /**
     * Emits an error
     */
    this.emitHeartBeat = function () {
        var msg = 'Heart beat event raised without message';
        if (arguments.length > 0) {
            msg = arguments[0];
        }
        this.emit(eventTypes.HEART_BEAT, msg);
    }


    function getUTimeInSecs() {
        return Math.floor(new Date().getTime() / 1000);
    }

    var counter = 0;
    function getEventId() {
        if (counter == 65535) {
            counter = 1; // skip 0, it means non-transaction
        }
        return ++counter;
    }
}

util.inherits(LogEmitter, events.EventEmitter);
