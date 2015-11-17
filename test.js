'use strict';

var test    = require('tape'),
    mqtt    = require('./'),
    WS      = require('readable-stream').Writable;

function testParseGenerate(name, object, buffer, opts) {
  test(name + ' parse', function(t) {
    t.plan(2);

    var parser    = mqtt.parser(opts),
        expected  = object,
        fixture   = buffer;

    parser.on('packet', function(packet) {
      delete packet.length;
      t.deepEqual(packet, expected, 'expected packet');
    });

    t.equal(parser.parse(fixture), 0, 'remaining bytes');
  });

  test(name + ' generate', function(t) {
    t.equal(mqtt.generate(object).toString('hex'), buffer.toString('hex'));
    t.end();
  });

  test(name + ' mirror', function(t) {
    t.plan(2);

    var parser    = mqtt.parser(opts),
        expected  = object,
        fixture   = mqtt.generate(object);

    parser.on('packet', function(packet) {
      delete packet.length;
      t.deepEqual(packet, expected, 'expected packet');
    });

    t.equal(parser.parse(fixture), 0, 'remaining bytes');
  });
}


testParseGenerate('advertise', {
  cmd: 'advertise',
  gwId: 34,
  duration: 3600
}, new Buffer([
  3, 0, // Header
  34, // Gateway Id
  14, 16 // Duration
]));