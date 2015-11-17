'use strict';

/* Protocol - protocol constants */
var protocol = module.exports;

protocol.types = {
  0: 'advertise',
  1: 'searchgw',
  2: 'gwinfo',
  3: 'reserved',
  4: 'connect',
  5: 'connack',
  6: 'willtopicreq',
  7: 'willtopic',
  8: 'willmsgreq',
  9: 'willmsg',
  10: 'register',
  11: 'regack',
  12: 'publish',
  13: 'puback',
  14: 'pubcomp',
  15: 'pubrec',
  16: 'pubrel',
  17: 'reserved',
  18: 'subscribe',
  19: 'suback',
  20: 'unsubscribe',
  21: 'unsuback',
  22: 'pingreq',
  23: 'pingresp',
  24: 'disconnect',
  25: 'reserved',
  26: 'willtopicupd',
  27: 'willtopicresp',
  28: 'willmsgupd',
  29: 'willmsgresp',
  254: 'Encasulated message',
  255: 'reserved'
};

for (var i = 30; i < 254; i += 1) {
  protocol.types[i] = 'reserved';
}

/* Mnemonic => Command code */
/* jshint forin:false : there is no unwanted prototype here */
protocol.codes = {};
for (var k in protocol.types) {
  var v = protocol.types[k];
  protocol.codes[v] = k;
}
/* jshint forin:true */

protocol.DUP_MASK = 0x80;
protocol.QOS_MASK = 0x60;
protocol.QOS_SHIFT = 5;
protocol.RETAIN_MASK = 0x10;
protocol.WILL_MASK = 0x08;
protocol.CLEAN_MASK = 0x04;
protocol.TOPICIDTYPE_MASK = 0x03;

protocol.ID = 0x01;

protocol.RADIUS_MASK = 0x03;