const { CdrReader, CdrReaderError } = require('./cdrReader');

class RosbagMessageDeserializationError extends Error {
  constructor(message, code, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'RosbagMessageDeserializationError';
    this.code = code;
  }
}

const parameterTypeNames = Object.freeze({
  0: 'NOT_SET',
  1: 'BOOL',
  2: 'INTEGER',
  3: 'DOUBLE',
  4: 'STRING',
  5: 'BYTE_ARRAY',
  6: 'BOOL_ARRAY',
  7: 'INTEGER_ARRAY',
  8: 'DOUBLE_ARRAY',
  9: 'STRING_ARRAY',
});

function readTime(reader) {
  return {
    sec: reader.readInt32(),
    nanosec: reader.readUint32(),
  };
}

function readHeader(reader) {
  return {
    stamp: readTime(reader),
    frameId: reader.readString(),
  };
}

function readPoint(reader) {
  return {
    x: reader.readFloat64(),
    y: reader.readFloat64(),
    z: reader.readFloat64(),
  };
}

function readQuaternion(reader) {
  return {
    x: reader.readFloat64(),
    y: reader.readFloat64(),
    z: reader.readFloat64(),
    w: reader.readFloat64(),
  };
}

function readPose(reader) {
  return {
    position: readPoint(reader),
    orientation: readQuaternion(reader),
  };
}

function readParameterValue(reader) {
  const type = reader.readUint8();
  const values = {
    bool: reader.readBool(),
    integer: reader.readInt64().toString(),
    double: reader.readFloat64(),
    string: reader.readString(),
    byteArray: reader.readByteSequence(),
    boolArray: reader.readSequence(() => reader.readBool()),
    integerArray: reader.readSequence(() => reader.readInt64().toString()),
    doubleArray: reader.readSequence(() => reader.readFloat64()),
    stringArray: reader.readSequence(() => reader.readString()),
  };

  const valueByType = {
    0: null,
    1: values.bool,
    2: values.integer,
    3: values.double,
    4: values.string,
    5: values.byteArray,
    6: values.boolArray,
    7: values.integerArray,
    8: values.doubleArray,
    9: values.stringArray,
  };

  return {
    type,
    typeName: parameterTypeNames[type] ?? 'UNKNOWN',
    value: valueByType[type] ?? null,
  };
}

function readParameter(reader) {
  return {
    name: reader.readString(),
    value: readParameterValue(reader),
  };
}

function deserializeImage(data) {
  const reader = new CdrReader(data);

  return {
    header: readHeader(reader),
    height: reader.readUint32(),
    width: reader.readUint32(),
    encoding: reader.readString(),
    isBigendian: reader.readBool(),
    step: reader.readUint32(),
    data: reader.readByteSequence(),
  };
}

function deserializeCameraInfo(data) {
  const reader = new CdrReader(data);

  return {
    header: readHeader(reader),
    height: reader.readUint32(),
    width: reader.readUint32(),
    distortionModel: reader.readString(),
    d: reader.readSequence(() => reader.readFloat64()),
    k: reader.readFixedArray(9, () => reader.readFloat64()),
    r: reader.readFixedArray(9, () => reader.readFloat64()),
    p: reader.readFixedArray(12, () => reader.readFloat64()),
    binningX: reader.readUint32(),
    binningY: reader.readUint32(),
    roi: {
      xOffset: reader.readUint32(),
      yOffset: reader.readUint32(),
      height: reader.readUint32(),
      width: reader.readUint32(),
      doRectify: reader.readBool(),
    },
  };
}

function deserializeCompressedImage(data) {
  const reader = new CdrReader(data);

  return {
    header: readHeader(reader),
    format: reader.readString(),
    data: reader.readByteSequence(),
  };
}

function deserializeJointState(data) {
  const reader = new CdrReader(data);

  return {
    header: readHeader(reader),
    name: reader.readSequence(() => reader.readString()),
    position: reader.readSequence(() => reader.readFloat64()),
    velocity: reader.readSequence(() => reader.readFloat64()),
    effort: reader.readSequence(() => reader.readFloat64()),
  };
}

function deserializePoseStamped(data) {
  const reader = new CdrReader(data);

  return {
    header: readHeader(reader),
    pose: readPose(reader),
  };
}

function deserializePointStamped(data) {
  const reader = new CdrReader(data);

  return {
    header: readHeader(reader),
    point: readPoint(reader),
  };
}

function deserializePoseWithCovarianceStamped(data) {
  const reader = new CdrReader(data);

  return {
    header: readHeader(reader),
    pose: {
      pose: readPose(reader),
      covariance: reader.readFixedArray(36, () => reader.readFloat64()),
    },
  };
}

function deserializeLog(data) {
  const reader = new CdrReader(data);

  return {
    stamp: readTime(reader),
    level: reader.readUint8(),
    name: reader.readString(),
    message: reader.readString(),
    file: reader.readString(),
    function: reader.readString(),
    line: reader.readUint32(),
  };
}

function deserializeParameterEvent(data) {
  const reader = new CdrReader(data);

  return {
    stamp: readTime(reader),
    node: reader.readString(),
    newParameters: reader.readSequence(() => readParameter(reader)),
    changedParameters: reader.readSequence(() => readParameter(reader)),
    deletedParameters: reader.readSequence(() => readParameter(reader)),
  };
}

function deserializeTheoraPacket(data) {
  const reader = new CdrReader(data);

  return {
    header: readHeader(reader),
    data: reader.readByteSequence(),
    bOs: reader.readInt32(),
    eOs: reader.readInt32(),
    // 64-bit整数は精度を失わない文字列としてアプリへ渡す。
    granulepos: reader.readInt64().toString(),
    packetno: reader.readInt64().toString(),
  };
}

function deserializeWriteSplitEvent(data) {
  const reader = new CdrReader(data);
  const closedFile = reader.readString();
  const openedFile = reader.readString();

  return {
    closedFile,
    openedFile,
    // ROS 2の版によって末尾のnode_nameが存在しない場合がある。
    nodeName: reader.remainingBytes >= 4 ? reader.readString() : null,
  };
}

const deserializersByType = Object.freeze({
  'sensor_msgs/msg/Image': deserializeImage,
  'sensor_msgs/msg/CameraInfo': deserializeCameraInfo,
  'sensor_msgs/msg/CompressedImage': deserializeCompressedImage,
  'sensor_msgs/msg/JointState': deserializeJointState,
  'geometry_msgs/msg/PoseStamped': deserializePoseStamped,
  'geometry_msgs/msg/PointStamped': deserializePointStamped,
  'geometry_msgs/msg/PoseWithCovarianceStamped': deserializePoseWithCovarianceStamped,
  'rcl_interfaces/msg/Log': deserializeLog,
  'rcl_interfaces/msg/ParameterEvent': deserializeParameterEvent,
  'theora_image_transport/msg/Packet': deserializeTheoraPacket,
  'rosbag2_interfaces/msg/WriteSplitEvent': deserializeWriteSplitEvent,
});

/**
 * トピックの型とserialization formatに対応するデシリアライザを選択する。
 */
function deserializeRosbagMessage({ data, serializationFormat, type }) {
  if (typeof type !== 'string' || type === '') {
    throw new RosbagMessageDeserializationError(
      'ROSメッセージ型を指定してください。',
      'INVALID_ROSBAG_TOPIC_TYPE',
    );
  }

  if (serializationFormat !== 'cdr') {
    throw new RosbagMessageDeserializationError(
      `未対応のシリアライズ形式です: ${serializationFormat ?? '未指定'}`,
      'UNSUPPORTED_ROSBAG_SERIALIZATION_FORMAT',
    );
  }

  const deserialize = deserializersByType[type];

  if (!deserialize) {
    throw new RosbagMessageDeserializationError(
      `未対応のROSメッセージ型です: ${type}`,
      'UNSUPPORTED_ROSBAG_TOPIC_TYPE',
    );
  }

  try {
    return deserialize(data);
  } catch (error) {
    if (error instanceof RosbagMessageDeserializationError) {
      throw error;
    }

    const code = error instanceof CdrReaderError
      ? 'MALFORMED_CDR_MESSAGE'
      : 'ROSBAG_MESSAGE_DESERIALIZATION_FAILED';

    throw new RosbagMessageDeserializationError(
      `${type} のメッセージをデシリアライズできませんでした。`,
      code,
      error,
    );
  }
}

module.exports = {
  RosbagMessageDeserializationError,
  deserializeCameraInfo,
  deserializeCompressedImage,
  deserializeImage,
  deserializeJointState,
  deserializeLog,
  deserializeParameterEvent,
  deserializePointStamped,
  deserializePoseStamped,
  deserializePoseWithCovarianceStamped,
  deserializeRosbagMessage,
  deserializeTheoraPacket,
  deserializeWriteSplitEvent,
  supportedRosbagMessageTypes: Object.freeze(Object.keys(deserializersByType)),
};
