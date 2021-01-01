type ReturnCodeString =
  | "Accepted"
  | "Rejected: congestion"
  | "Rejected: invalid topic ID"
  | "Rejected: not supported";

type QOS = number;

type TopicType =
  | "normal"
  | "pre-defined"
  | "short topic";

interface BaseMQTTSNPacket {
  cmd: "advertise" | "searchgw" | "gwinfo" | "connect" | "connack" | "willtopicresp" | "willmsgresp" | "willtopicreq"
    | "willmsgreq" | "pingresp" | "willtopic" | "willtopicupd" | "willmsg" | "willmsgupd" | "register" | "regack"
    | "publish" | "puback" | "pubcomp" | "pubrec" | "pubrel" | "unsuback" | "unsubscribe" | "subscribe" | "suback"
    | "pingreq" | "disconnect";

  length?: number;
}

interface GenericAck extends BaseMQTTSNPacket {
  returnCode: ReturnCodeString | null;
}

interface Advertise extends BaseMQTTSNPacket {
  cmd: "advertise";
  gwId: number;
  duration: number;
}

interface SearchGw extends BaseMQTTSNPacket {
  cmd: "searchgw";
  radius: number;
}

interface GwInfo extends BaseMQTTSNPacket {
  cmd: "gwinfo";
  gwId: number;
  gwAdd?: Buffer;
}

interface Connect extends BaseMQTTSNPacket {
  cmd: "connect";
  duration: number;
  clientId: string;
  will: boolean;
  cleanSession: boolean;
}

interface ConnAck extends GenericAck {
  cmd: "connack";
}

interface WillTopic extends BaseMQTTSNPacket {
  cmd: "willtopic";
  qos?: QOS;
  retain?: boolean;
  willTopic?: string;
}

interface WillTopicResp extends GenericAck {
  cmd: "willtopicresp";
}

interface WillTopicUpd extends BaseMQTTSNPacket {
  cmd: "willtopicupd";
  qos?: QOS;
  retain?: boolean;
  willTopic?: string;
}

interface WillMsg extends BaseMQTTSNPacket {
  cmd: "willmsg";
  willMsg: string;
}

interface WillMsgResp extends GenericAck {
  cmd: "willmsgresp";
}

interface WillMsgUpd extends BaseMQTTSNPacket {
  cmd: "willmsgupd";
  willMsg: string;
}

interface Register extends BaseMQTTSNPacket {
  cmd: "register";
  topicId: number;
  msgId: number;
  topicName: string;
}

interface RegAck extends GenericAck {
  cmd: "regack";
  topicId: number;
  msgId: number;
}

interface Publish<TT extends TopicType, TID> extends BaseMQTTSNPacket {
  cmd: "publish";
  dup: boolean;
  qos: QOS;
  topicIdType: TT;
  topicId: TID;
  msgId: number;
  payload: Buffer;
}

type PublishShortTopic = Publish<"short topic", string>;
type PublishPredefined = Publish<"pre-defined", number>;
type PublishRegisteredTopic = Publish<"normal", number>;

interface PubAck extends GenericAck {
  cmd: "puback";
  topicId: number;
  msgId: number;
}

interface PubComp extends BaseMQTTSNPacket {
  cmd: "pubcomp";
  msgId: number;
}

interface PubRec extends BaseMQTTSNPacket {
  cmd: "pubrec";
  msgId: number;
}

interface PubRel extends BaseMQTTSNPacket {
  cmd: "pubrel";
  msgId: number;
}

interface UnsubAck extends BaseMQTTSNPacket {
  cmd: "unsuback";
  msgId: number;
}

interface Unsubscribe<TT extends TopicType, TN, TID> extends BaseMQTTSNPacket {
  cmd: "unsubscribe";
  msgId: number;
  topicIdType: TT;
  topicName: TN;
  topicId: TID;
}

type UnsubscribePredefined = Unsubscribe<"pre-defined", undefined, number>;
type UnsubscribeRegisteredTopic = Unsubscribe<"normal", undefined, number>;
type UnsubscribeShortTopic = Unsubscribe<"short topic", string, undefined>;

interface Subscribe<TT extends TopicType, TN, TID> extends BaseMQTTSNPacket {
  cmd: "subscribe";
  msgId: number;
  topicIdType: TT;
  topicName: TN;
  topicId: TID;
  dup: boolean;
  qos: QOS;
}

declare type SubscribePredefined = Subscribe<"pre-defined", undefined, number>;
declare type SubscribeRegisteredTopic = Subscribe<"normal", undefined, number>;
declare type SubscribeShortTopic = Subscribe<"short topic", string, undefined>;

interface SubAck extends GenericAck {
  cmd: "suback";
  topicId: number;
  msgId: number;
  qos: QOS;
}

interface PingReq extends BaseMQTTSNPacket {
  cmd: "pingreq";
  clientId?: string;
}

interface Disconnect extends BaseMQTTSNPacket {
  cmd: "disconnect";
  duration?: number;
}


export type MQTTSNPacket =
  | Advertise | SearchGw | GwInfo
  | Connect | Disconnect | ConnAck
  | WillMsg | WillMsgUpd | WillTopic | WillTopicUpd | WillMsgResp | WillTopicResp
  | Register
  | RegAck
  | PublishPredefined | PublishRegisteredTopic | PublishShortTopic
  | PubAck | PubComp | PubRec | PubRel
  | SubscribePredefined | SubscribeRegisteredTopic | SubscribeShortTopic
  | SubAck
  | UnsubscribePredefined | UnsubscribeRegisteredTopic | UnsubscribeShortTopic
  | UnsubAck
  | PingReq
  | BaseMQTTSNPacket;