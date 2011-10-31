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

"use strict";

var eventTypes = require(__dirname + '/event-types.js'),
    uuid = require('node-uuid'),
    sys = require('sys');

var procEmitter = process.EventEmitter();

function getEventId() {
    process.qlioTxIdCtr = process.qlioTxIdCtr || 1;
    process.qlioTxIdCtr++;
    if (process.qlioTxIdCtr == 65535) {
        process.qlioTxIdCtr = 1; // skip 0, it means non-transaction
    }
    return process.qlioTxIdCtr;
}


var beginEvent = exports.beginEvent = function(parent, type, name) {
    return  {
        eventId: getEventId(),
        parentEventId: (parent ? parent.eventId = parent.eventId || 0 : 0),
        startTime: getUTimeInSecs(),
        tx: 'begin',
        type: type || 'QlIo',
        txType: type || 'QlIo',
        name: name || (type || 'QLIo'),
        txName: name || (type || 'QLIo'),
        uuid: (parent && parent.guid ? parent.guid : uuid())
    };
}

var endEvent = exports.endEvent = function(obj) {
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

var wrapEvent = exports.wrapEvent = function(parent, txType, txName, cb) {
    var event = beginEvent(parent, txType, txName);
    procEmitter.emit(eventTypes.BEGIN_EVENT, event);
    return {
        event: event,
        cb: function(e, r) {
            var message = 'Success';
            if (e) {
                procEmitter.emit(eventTypes.ERROR, event, sys.inspect(e, false, null));
                message = 'Failure'
            }
            endEvent(event);
            procEmitter.emit(eventTypes.END_EVENT, event, message); //end
            return cb(e, r);
        }
    }
}

exports.emitEvent = function(event, msg){
  procEmitter.emit(eventTypes.EVENT, event, msg);
}

exports.emitWarning = function(event, msg){
  procEmitter.emit(eventTypes.WARNING, event, msg);
}

exports.emitError = function(event, msg){
  procEmitter.emit(eventTypes.ERROR, event, msg);
}

function getUTimeInSecs() {
    return Math.floor(new Date().getTime() / 1000);
}
