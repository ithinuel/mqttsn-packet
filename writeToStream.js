'use strict';

var protocol = require('./constants');

function uncork(stream) {
  stream.uncork();
}

function streamWriteUInt16BE(stream, number) {
  var buffer = new Buffer(2);
  buffer.writeUInt16BE(number, 0);
  stream.write(buffer);
}

function advertise(opts, stream) {
  opts = opts || {};
  var gwId = opts.gwId || 0,
      duration = opts.duration || 60;
  
  streamWriteUInt16BE(stream, 0x0300);
  stream.write(new Buffer([gwId]));
  streamWriteUInt16BE(stream, duration);
}

function generate(packet, stream) {
  if (stream.cork) {
    stream.cork();
    process.nextTick(uncork, stream);
  }
  
  switch (packet.cmd) {
    case 'advertise':
      return advertise(packet, stream);
    default:
      stream.emit('error', new Error('unknown command'));
      return false;
  }  
}

module.exports = generate;