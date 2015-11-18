'use strict';

var protocol = require('./constants');

function uncork(stream) {
  stream.uncork();
}

function getReturnCode(returnType) {
  var returnCode = protocol.return_codes[returnType];
  if (returnCode !== undefined) {
    return returnCode;
  } else {
    return protocol.return_codes['Rejected: not supported'];
  }
}

function streamWriteUInt16BE(stream, number) {
  var buffer = new Buffer(2);
  buffer.writeUInt16BE(number, 0);
  stream.write(buffer);
}

function streamWriteLength(stream, length) {
  var buffer;
  if (length >= 256) {
    buffer = new Buffer(3);
    buffer.writeUInt8(0, 1);
    buffer.writeUInt16BE(0, length);
  } else {
    buffer = new Buffer([length]);
  }
  stream.write(buffer);
}

function advertise(opts, stream) {
  var gwId = opts.gwId || 0,
      duration = opts.duration || 60;
  
  /* fixed len : 5, code: 0 */
  stream.write(new Buffer([0x05, protocol.codes.advertise, gwId]));
  streamWriteUInt16BE(stream, duration);
}

function searchGW(opts, stream) {
  var radius = opts.radius || 0;
  
  stream.write(new Buffer([0x3, protocol.codes.searchgw, radius]));
}

function gwInfo(opts, stream) {
  var gwId = opts.gwId || 0,
      gwAdd = opts.gwAdd,
      isClient = opts.isClient || false,
      length = 3;
  
  if (isClient) {
    length += 1;
    if (typeof gwAdd === 'string') {
      length += Buffer.byteLength(gwAdd);
    } else {
      length += gwAdd.length;
    }
  }
  
  streamWriteLength(stream, length);
  stream.write(new Buffer([protocol.codes.gwinfo, gwId]));
  if (isClient) {
    if (typeof gwAdd === 'string') {
      stream.write(new Buffer([Buffer.byteLength(gwAdd)]));
      stream.write(gwAdd, 'utf8');
    } else {
      stream.write(new Buffer([gwAdd.length]));
      stream.write(gwAdd);
    }
  }
}

function connect(opts, stream) {
  var flags = 0,
      duration = opts.duration || 0;
  
  flags |= opts.will ? protocol.WILL_MASK : 0;
  flags |= opts.cleanSession ? protocol.CLEAN_MASK : 0;
  
  streamWriteLength(stream, 6 + Buffer.byteLength(opts.clientId));
  stream.write(new Buffer([protocol.codes.connect, flags, protocol.ID]));
  streamWriteUInt16BE(stream, duration);
  stream.write(opts.clientId, 'utf8');
}

function respCode(opts, stream) {
  var returnCode = getReturnCode(opts.returnCode);
  
  stream.write(new Buffer([3, protocol.codes[opts.cmd], returnCode]));
}

function request(opts, stream) {
  stream.write(new Buffer([2, protocol.codes[opts.cmd]]));
}

function willtopic(opts, stream) {
  var length = 2;
  if (opts.willTopic) {
    length = 3 + Buffer.byteLength(opts.willTopic);
  }
  streamWriteLength(stream, length);
  if (opts.willTopic) {
    var flags = 0,
        qos = opts.qos || 0,
        retain = opts.retain || false;
    flags |= (qos << protocol.QOS_SHIFT) & protocol.QOS_MASK;
    flags |= retain ? protocol.RETAIN_MASK : 0;
    stream.write(new Buffer([protocol.codes[opts.cmd], flags]));
    stream.write(opts.willTopic);
  } else {
    stream.write(new Buffer([protocol.codes[opts.cmd]]));
  }
}

function willmsg(opts, stream) {
  var willMsg = opts.willMsg || '';
  streamWriteLength(stream, 2 + Buffer.byteLength(willMsg));
  stream.write(new Buffer([protocol.codes[opts.cmd]]));
  stream.write(willMsg);
}

function register(opts, stream) {
  var topicName = opts.topicName || '',
      topicId = opts.topicId || 0,
      msgId = opts.msgId || 0,
      length = 6 + Buffer.byteLength(topicName);
  streamWriteLength(stream, length);
  stream.write(new Buffer([protocol.codes.register]));
  streamWriteUInt16BE(stream, topicId);
  streamWriteUInt16BE(stream, msgId);
  stream.write(topicName);
}

function regack(opts, stream) {
  var topicId = opts.topicId || 0,
      msgId = opts.msgId || 0,
      retCode = getReturnCode(opts.returnCode);
  
  stream.write(new Buffer([7, protocol.codes.regack]));
  streamWriteUInt16BE(stream, topicId);
  streamWriteUInt16BE(stream, msgId);
  stream.write(new Buffer([retCode]));
}

function publish(opts, stream) {
  var flags = 0,
      topicId = opts.topicId || 0,
      msgId = opts.msgId || 0,
      topicIdType = 0,
      length = 7,
      payload = opts.payload || '';
  
  if (typeof opts.payload === 'string') {
    length += Buffer.byteLength(payload);
  } else {
    length += payload.length;
  }
  
  flags |= opts.dup ? protocol.DUP_MASK : 0;
  flags |= ((opts.qos || 0) << protocol.QOS_SHIFT) & protocol.QOS_MASK;
  flags |= opts.retain ? protocol.RETAIN_MASK : 0;
  if (protocol.topicIdCodes[opts.topicIdType] === undefined) {
    stream.emit('error', new Error('Invalid topic Id Type'));
    return false;
  } else {
    flags |= protocol.topicIdCodes[opts.topicIdType];
  }
  
  streamWriteLength(stream, length);
  stream.write(new Buffer([protocol.codes.publish, flags]));
  streamWriteUInt16BE(stream, topicId);
  streamWriteUInt16BE(stream, msgId);
  stream.write(payload);
}

function generate(packet, stream) {
  if (stream.cork) {
    stream.cork();
    process.nextTick(uncork, stream);
  }
  
  switch (packet.cmd) {
    case 'advertise':
      return advertise(packet, stream);
    case 'searchgw':
      return searchGW(packet, stream);
    case 'gwinfo':
      return gwInfo(packet, stream);
    case 'connect':
      return connect(packet, stream);
    case 'connack':
    case 'willtopicresp':
    case 'willmsgresp':
      return respCode(packet, stream);
    case 'willtopicreq':
    case 'willmsgreq':
    case 'pingresp':
      return request(packet, stream);
    case 'willtopic':
    case 'willtopicupd':
      return willtopic(packet, stream);
    case 'willmsg':
    case 'willmsgupd':
      return willmsg(packet, stream);
    case 'register':
      return register(packet, stream);
    case 'regack':
      return regack(packet, stream);
    case 'publish':
      return publish(packet, stream);
    default:
      stream.emit('error', new Error('unknown command'));
      return false;
  }  
}

module.exports = generate;