'use strict';

var writeToStream = require('./writeToStream'),
    EE            = require('events').EventEmitter,
    inherits      = require('util').inherits;

function Accumulator() {
  this._array = new Array(6);
  this._i = 0;
}

inherits(Accumulator, EE);

Accumulator.prototype.write = function accumulatorWrite(chunk) {
  this._array[this._i] = chunk;
  this._i += 1;
  return true;
};

Accumulator.prototype.concat = function accumulatorConcat() {
  var length = 0,
      list = this._array,
      lengths = new Array(list.length),
      pos = 0,
      i = 0, result;
  
  for (i = 0; i < list.length && list[i]; i += 1) {
    
    if (typeof list[i] !== 'string') {
      lengths[i] = list[i].length;
    } else {
      lengths[i] = Buffer.byteLength(list[i]);
    }
    length += lengths[i];
  }
  
  result = new Buffer(length);
  for (i = 0; i < list.length && list[i]; i += 1) {
    if (typeof list[i] !== 'string') {
      list[i].copy(result, pos);
      pos += lengths[i];
    } else {
      result.write(list[i], pos);
      pos += lengths[i];
    }
  }
  return result;
};

function generate(packet) {
  var stream = new Accumulator();
  writeToStream(packet, stream);
  return stream.concat();
}

module.exports = generate;