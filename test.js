'use strict';

var test    = require('tape'),
    mqtt    = require('./'),
    WS      = require('readable-stream').Writable;

function testParseGenerate(name, object, buffer, opts, expect) {
  test(name + ' parse', function(t) {
    t.plan(2);

    var parser    = mqtt.parser(opts),
        expected  = expect || object,
        fixture   = buffer;

    parser.on('packet', function(packet) {
      t.deepEqual(packet, expected, 'expected packet');
    });
    parser.on('error', function (error) {
      t.fail('unexpected parse error: ' + error);
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
        expected  = expect || object,
        fixture   = mqtt.generate(object);

    parser.on('packet', function(packet) {
      t.deepEqual(packet, expected, 'expected packet');
    });

    t.equal(parser.parse(fixture), 0, 'remaining bytes');
  });
}

function testParseError(expected, fixture) {
  test(expected, function(t) {
    t.plan(1);

    var parser = mqtt.parser();

    parser.on('error', function(err) {
      t.equal(err.message, expected, 'expected error message');
    });

    parser.parse(fixture);
  });
}

testParseError('command not supported', new Buffer([
  2, 248 // header
]));

testParseGenerate('advertise', {
  cmd: 'advertise',
  gwId: 34,
  duration: 3600
}, new Buffer([
  5, 0, // Header
  34, // Gateway Id
  14, 16 // Duration
]));

testParseGenerate('searchgw', {
  cmd: 'searchgw',
  radius: 85
}, new Buffer([
  3, 1, // Header
  85, // radius
]));

testParseGenerate('gwinfo as server', {
  cmd: 'gwinfo',
  gwId: 34,
  gwAdd: new Buffer([48, 24])
}, new Buffer([
  3, 2, // Header
  34, // Gateway Id
]), {}, {
  cmd: 'gwinfo',
  gwId: 34
});

testParseGenerate('gwinfo as client', {
  cmd: 'gwinfo',
  gwId: 34,
  gwAdd: new Buffer([48, 24]),
  isClient: true
}, new Buffer([
  6, 2,     // Header
  34,       // Gateway Id
  2, 48, 24 // Gateway address
]), {
  isClient: true
}, {
  cmd: 'gwinfo',
  gwId: 34,
  gwAdd: new Buffer([48, 24])
});

testParseGenerate('connect', {
  cmd: 'connect',
  will: true,
  cleanSession: true,
  duration: 3600,
  clientId: 'testClientId'
}, new Buffer([
  18, 4,  // header
  12, 1,   // flags & protocolId
  14, 16,  // duration
  116, 101, 115, 116, 67, 108, 105, 101, 110, 116, 73, 100
]));

testParseGenerate('connack', {
  cmd: 'connack',
  returnCode: 'Accepted'
}, new Buffer([
  3, 5, // header
  0     // return code
]));

testParseGenerate('willtopicreq', {
  cmd: 'willtopicreq'
}, new Buffer([
  2, 6, // header
]));

testParseGenerate('empty willtopic', {
  cmd: 'willtopic',
}, new Buffer([
  2, 7, // header
]));

testParseGenerate('willtopic', {
  cmd: 'willtopic',
  qos: 1,
  retain: true,
  willTopic: 'hello/world'
}, new Buffer([
  14, 7,  // header
  48,     // flags
  104, 101, 108, 108, 111, 47, 119, 111, 114, 108, 100
]));

testParseGenerate('empty willmsg', {
  cmd: 'willmsg',
  willMsg: ''
}, new Buffer([
  2, 9,  // header
]));

testParseGenerate('willmsg', {
  cmd: 'willmsg',
  willMsg: 'helloworld'
}, new Buffer([
  12, 9,  // header
  104, 101, 108, 108, 111, 119, 111, 114, 108, 100
]));

testParseGenerate('register', {
  cmd: 'register',
  topicId: 294,
  msgId: 24,
  topicName: 'hello/world'
}, new Buffer([
  17, 10,  // header
  1, 38,
  0, 24,
  104, 101, 108, 108, 111, 47, 119, 111, 114, 108, 100
]));

testParseGenerate('regack', {
  cmd: 'regack',
  topicId: 294,
  msgId: 24,
  returnCode: 'Rejected: congestion'
}, new Buffer([
  7, 11,  // header
  1, 38,
  0, 24,
  1
]));

testParseGenerate('publish on normal topicId', {
  cmd: 'publish',
  dup: true,
  qos: 1,
  retain: true,
  topicIdType: 'normal',
  topicId: 294,
  msgId: 24,
  payload: new Buffer('{"test":"bonjour"}')
}, new Buffer([
  25, 12,  // header
  0xB0,    // flags
  1, 38,  // topicId
  0, 24,  // msgId
  0x7b, 0x22, 0x74, 0x65, 0x73, 0x74, 0x22, 0x3a, 0x22, 0x62, 0x6f, 0x6e, 0x6a, 0x6f, 0x75, 0x72, 0x22, 0x7d
]));
