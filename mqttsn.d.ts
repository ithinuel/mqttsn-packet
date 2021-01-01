import { EventEmitter } from "events";
import { BaseMQTTSNPacket, MQTTSNPacket } from "./packet";

type OnPacketFn = <T extends MQTTSNPacket = MQTTSNPacket>(packet: T) => void;

interface Parser extends EventEmitter {
  parse(buf: Buffer): number;

  on(event: "packet", listener: OnPacketFn): this;
  off(event: "packet", listener: OnPacketFn): this;
  once(event: "packet", listener: OnPacketFn): this;
  addListener(event: "packet", listener: OnPacketFn): this;
  prependListener(event: "packet", listener: OnPacketFn): this;
  prependOnceListener(event: "packet", listener: OnPacketFn): this;
  listeners(event: "packet"): Function[];
  rawListeners(event: "packet"): Function[];
}

export var parser: {
  new(opts?: { isClient?: boolean }): Parser;
};
export function generate<P extends BaseMQTTSNPacket = BaseMQTTSNPacket>(packet: P): Buffer;
