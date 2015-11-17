'use strict';

var bl        = require('bl'),
    inherits  = require('util').inherits,
    EE        = require('events').EventEmitter,
    Packet    = require('./packet'),
    constants = require('./constants');

function Parser(isClient) {
  if (!(this instanceof Parser)) {
    return new Parser(isClient);
  }

  this._list = bl();
  this._newPacket();

  this._states = [
    '_parseHeader',
    '_parsePayload',
    '_newPacket'
  ];
  this._stateCounter = 0;
  this._isClient = isClient;
}

inherits(Parser, EE);

Parser.prototype._newPacket = function parserNewPacket() {
  if (this.packet) {
    this._list.consume(this.packet.length);
    this.emit('packet', this.packet);
  }
  
  this.packet = new Packet();
  
  return true;
};

Parser.prototype.parse = function parserParse(buf) {
  this._list.append(buf);
  
  this._pos = 0;
  while (((this.packet.length !== -1) || this._list.length > 0) &&
    this[this._states[this._stateCounter]]()) {
    this._stateCounter += 1;
    this._pos = 0;
    
    if (this._stateCounter >= this._states.length) {
      this._stateCounter = 0;
    }
  }
  return this._list.length;
};

Parser.prototype._parseHeaderInternal = function parserParseHeaderInternal() {
  var length = this._list.readUInt8(this._pos),
      cmdCodeOffset = 1;
  if (length === 0x01) {
    if (this._list.length < (this._pos + 4)) {
      return null;
    }
    
    length = this._list.readUInt16BE(this._pos + 1);
    cmdCodeOffset = 3;
  } else if (this._list.length < 2) {
    return null;
  }
  
  var cmdCode = this._list.readUInt8(this._pos + cmdCodeOffset);
  this._pos += cmdCodeOffset + 1;
  return {
    length: length,
    headerLength: cmdCodeOffset + 1,
    cmdCode: cmdCode
  };
};

Parser.prototype._parseHeader = function parserParseHeader() {
  var header = this._parseHeaderInternal();
  if (header === null) {
    return false;
  }
  
  this.packet.length = header.length;
  this.packet.cmd = constants.types[header.cmdCode];
  
  this._list.consume(header.headerLength);
  
  return true;
};

Parser.prototype._parsePayload = function parserParsePayload() {
  var result = false;
  
  if ((this.packet.length === 0) ||
      (this._list.length >= this.packet.length) ||
      (this.packet.cmd !== 'Encapsulated message')) {   
    switch (this.packet.cmd) {
      case 'advertise':
        this._parseAdvertise();
        break;
      case 'searchgw':
        this._parseSearchGW();
        break;
      case 'gwinfo':
        this._parseGWInfo();
        break;
      case 'connect':
        this._parseConnect();
        break;
      case 'connack':
      case 'willtopicresp':
      case 'willmsgresp':
        this._parseRespReturnCode();
        break;
      case 'willtopicupd':
      case 'willtopic':
        this._parseWillTopic();
        break;
      case 'willmsg':
      case 'willmsgupd':
        this._parseWillMsg();
        break;
      case 'register':
        this._parseRegister();
        break;
      case 'regack':
        this._parseRegAck();
        break;
      case 'publish':
        this._parsePublish();
        break;
      case 'puback':
        this._parsePubAck();
        break;
      case 'pubcomp':
      case 'pubrec':
      case 'pubrel':
      case 'unsuback':
        this._parseMsgId();
        break;
      case 'unsubscribe':
      case 'subscribe':
        this._parseSubscribeUnsubscribe();
        break;
      case 'suback':
        this._parseSubAck();
        break;
      case 'pingreq':
        this._parsePingReq();
        break;
      case 'disconnect':
        this._parseDisconnect();
        break;
      case 'willtopicreq':
      case 'willmsgreq':
      case 'pingresp':
        // these are empty, nothing to do
        break;
      default:
        this.emit('error', new Error('not supported'));
    }
    
    result = true;
  } else if (this.packet.cmd === 'Encasulated message') {
    result = this._parseEncapsulatedMsg();
  }
  
  return result;
};

Parser.prototype._parseAdvertise = function parserParseAdvertise() {
  var packet = this.packet;
  if (packet.length !== 3) {
    return this.emit('error', new Error('wrong packet length'));
  }
  
  packet.gwId = this._list.readUInt8(0);
  packet.duration = this._list.readUInt16BE(1);
};

Parser.prototype._parseSearchGW = function parserParseSearchGW() {
  var packet = this.packet;
  if (packet.length !== 1) {
    return this.emit('error', new Error('wrong packet length'));
  }
  
  packet.radius = this._list.readUInt8(0);
};

Parser.prototype._parseGWInfo = function parserParseGWInfo() {
  var packet = this.packet;
  if ((this._isClient && (packet.length < 2)) ||
      (!this._isClient && (packet.length !== 1))) {
    return this.emit('error', new Error('wrong packet length'));
  }
  
  packet.gwId = this._list.readUInt8(0);
  
  if (this._isClient) {
    var addLen = this._list.readUInt8(1);
    if (packet.length !== (2 + addLen)) {
      return this.emit('error', new Error('wrong packet length'));
    }
    
    packet.gwAdd = this._list.slice(2, packet.length);
  }  
};

Parser.prototype._parseConnect = function parserParseConnect() {
  var packet = this.packet;
  if (packet.length < 5) {
    return this.emit('error', new Error('packet too short'));
  }
  
  if (!this._parseFlags()) { return; }
  if (this._list.readUInt8(this._pos) !== constants.ID) {
    return this.emit('error', new Error('unsupported protocol ID'));
  }
  this._pos += 1;
  
  packet.duration = this._list.readUInt16BE(this._pos);
  packet.clientId = this._parseString();
  if (packet.clientId === null) {
    this.emit('error', new Error('cannot read client ID'));
  }
};

Parser.prototype._parseRespReturnCode = function parserParseRespReturnCode() {
  var packet = this.packet;
  if (packet.length !== 1) {
    return this.emit('error', new Error('wrong packet length'));
  }
  
  packet.returnCode = this._parseReturnCode();
};

Parser.prototype._parseWillTopic = function parserParseWillTopic() {
  var packet = this.packet;
  if (packet.length < 1) {
    return this.emit('error', new Error('packet too short'));
  }
  
  if (!this._parseFlags()) { return; }
  packet.willTopic = this._list.toString('utf8', this._pos, packet.length);
};

Parser.prototype._parseWillMsg = function parserParseWillMsg() {
  var packet = this.packet;
  
  packet.willMsg = this._list.toString('utf8', 0, packet.length);
};

Parser.prototype._parseRegister = function parserParseRegister() {
  var packet = this.packet;
  if (packet.length < 4) {
    return this.emit('error', new Error('packet too short'));
  }
  
  packet.topicId = this._list.readUInt16BE(0);
  packet.msgId = this._list.readUInt16BE(2);
  packet.topicName = this._list.toString('utf8', 4, packet.length);
};

Parser.prototype._parseRegAck = function parserParseRegAck() {
  var packet = this.packet;
  if (packet.length !== 5) {
    return this.emit('error', new Error('wrong packet length'));
  }
  
  packet.topicId = this._list.readUInt16BE(0);
  packet.msgId = this._list.readUInt16BE(2);
  this._pos += 4;
  packet.returnCode = this._parseReturnCode();
  if (packet.returnCode === null) {
    this.emit('error', new Error('cannot read return code'));
  }
};

Parser.prototype._parsePublic = function parserParsePublish() {
  var packet = this.packet;
  if (packet.length < 5) {
    return this.emit('error', new Error('packet too short'));
  }
  
  if (!this._parseFlags()) { return; }
  packet.topicId = this._list.readUInt16BE(this._pos);
  this._pos += 2;
  packet.msgId = this._list.readUInt16BE(this._pos);
  this._pos += 2;
  
  packet.payload = this._list.slice(this._pos, packet.length);
};

Parser.prototype._parsePubAck = function parserParsePubAck() {
  var packet = this.packet;
  if (packet.length !== 5) {
    return this.emit('error', new Error('wrong packet length'));
  }
  
  packet.topicId = this._list.readUInt16BE(0);
  packet.msgId = this._list.readUInt16BE(2);
  this._pos = 4;
  packet.returnCode = this._parseReturnCode();
};

Parser.prototype._parseMsgId = function parserParseMsgId() {
  var packet = this.packet;
  if (packet.length !== 2) {
    return this.emit('error', new Error('wrong packet length'));
  }
  
  packet.msgId = this._list.readUInt16BE(0);
};

Parser.prototype._parseSubscribeUnsubscribe = function parserParseSubscribeUnsubscribe() {
  var packet = this.packet;
  if (packet.length < 3) {
    return this.emit('error', new Error('packet too short'));
  }
  
  if (!this._parseFlags()) { return; }
  packet.msgId = this._list.readUInt16BE(this._pos);
  this._pos += 2;
  
  switch (packet.topicIdType) {
    case 'short name':
    case 'normal':
      packet.topicName = this._list.toString('utf8', this._pos, packet.length);
      break;
    case 'pre-defined':
      if (packet.length !== 5) {
        return this.emit('error', new Error('wrong packet length'));
      }
      packet.topicId = this._list.readUInt16BE(this._pos);
      break;
  }
};
Parser.prototype._parseSubAck = function parserParseSubAck() {
  var packet = this.packet;
  if (packet.length !== 6) {
    return this.emit('error', new Error('wrong packet length'));
  }
  
  if (!this._parseFlags()) { return; }
  packet.topicId = this._list.readUInt16BE(this._pos);
  this._pos += 2;
  packet.msgId = this._list.readUInt16BE(this._pos);
  this._pos += 2;
  packet.returnCode = this._parseReturnCode();  
};

Parser.prototype._parsePingReq = function parserParsePingReq() {
  var packet = this.packet;
  if (packet.length !== 0) {
    packet.clientId = this._list.toString('utf8', 0, packet.length);
  }
};

Parser.prototype._parseDisconnect = function parserParseDisconnect() {
  var packet = this.packet;
  if (packet.length === 2) {
    packet.duration = this._list.readUInt16BE(0);
  } else if (packet.length !== 0) {
    return this.emit('error', new Error('wrong packet length'));
  }
};

Parser.prototype._parseEncapsulatedMsg = function parserParseEncapsulatedMsg() {
  var packet = this.packet;
  if (packet.length < 1) {
    this.emit('error', new Error('packet too short'));
    return false;
  }
  
  var ctrl = this._list.readUInt8(0);
  packet.radius = ctrl & constants.RADIUS_MASK;
  packet.wirelessNodeId = this._list.toString('utf8', 1, packet.length);
  this._pos += packet.length;
  
  var header = this._parseHeaderInternal();
  if (header === null) {
    return false;
  }
  if (header.cmdCode === constants.codes['Encapsulated message']) {
    this.emit('error', new Error('nested encapsulated message is not supported'));
  }
  if (this._list.length < (this._pos + header.length + header.headerLength)) {
    return false;
  }
  packet.encapsulated = this._list.slice(this._pos, this._pos + header.length + header.headerLength);
  
  return true;
};

Parser.prototype._parseReturnCode = function parserParseReturnCode() {
  var packet = this.packet;
  
  if (packet.length < (this._pos + 1)) {
    return null;
  }
  var retCode = this._list.readUInt8(this._pos),
      result = null;
    
  switch (retCode) {
    case 0x00: 
      result = 'Accepted';
      break;
    case 0x01:
      result = 'Rejected: congestion';
      break;
    case 0x02:
      result = 'Rejected: invalid topic ID';
      break;
    case 0x03:
      result = 'Rejected: not supported';
      break;
    default:
      result = 'reserved';
  }
  
  this._pos += 1;
  
  return result;
};

Parser.prototype._parseFlags = function parserParseFlags() {
  var packet = this.packet,
      flags = this._list.readUInt8(this._pos),
      result = true;
  if (flags === -1) {
    this.emit('error', new Error('cannot read flags'));
    return false;
  }
  
  if ((packet.cmd === 'publish') ||
      (packet.cmd === 'subscribe')) {
    packet.dup = (flags & constants.DUP_MASK) === constants.DUP_MASK;
  }
  
  if ((packet.cmd === 'willtopic') ||
      (packet.cmd === 'publish') ||
      (packet.cmd === 'subscribe') ||
      (packet.cmd === 'suback')) {
    packet.qos = (flags & constants.QOS_MASK) >> constants.QOS_SHIFT;
  }
  
  if ((packet.cmd === 'willtopic') ||
      (packet.cmd === 'publish')) {
    packet.retain = (flags & constants.RETAIN_MASK) === constants.RETAIN_MASK;
  }
  if (packet.cmd === 'connect') {
    packet.will = (flags & constants.WILL_MASK) === constants.WILL_MASK;
    packet.cleanSession = (flags & constants.CLEAN_MASK) === constants.CLEAN_MASK;
  }
  if ((packet.cmd === 'publish') ||
      (packet.cmd === 'subscribe') ||
      (packet.cmd === 'unsubscribe')) {
    switch (flags & constants.TOPICIDTYPE_MASK) {
      case 0x00:
        packet.topicIDType = 'normal';
        break;
      case 0x01:
        packet.topicIDType = 'pre-defined';
        break;
      case 0x02:
        packet.topicIDType = 'short topic';
        break;
      default:
        this.emit('error', new Error('unsupported topic id type'));
        result = false;
    }
  }
  return result;
};

Parser.prototype._parseString = function parserParseString() {
  var packet = this.packet;
  
  if (packet.length < (this._pos + 2)) {
    return null;
  }
  var length = this._list.readUInt16BE(this._pos),
      result;
  this._pos += 2;
  
  if (packet.length < (this._pos + length)) {
    return null;
  }
  
  result = this._list.toString('utf8', this._pos, this._pos + length);
  this._pos += length;
  
  return result;
};

module.exports = Parser;
