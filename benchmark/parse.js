var mqttsn  = require('../'),
    parser  = mqttsn.parser(),
    max     = 10000000,
    i,
    start   = Date.now(),
    time,
    buf     = new Buffer([
  25, 12,  // header publish
  176,    // flags
  1, 38,  // topicId
  0, 24,  // msgId
  0x7b, 0x22, 0x74, 0x65, 0x73, 0x74, 0x22, 0x3a, 0x22, 0x62, 0x6f, 0x6e, 0x6a, 0x6f, 0x75, 0x72, 0x22, 0x7d
]);

for (i = 0; i < max; i += 1) {
  parser.parse(buf);
}

time = Date.now() - start;
console.log('Total time', time);
console.log('Total packets', max);
console.log('Packet/s', max / time * 1000);
