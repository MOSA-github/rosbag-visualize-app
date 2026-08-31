const assert = require('node:assert/strict');
const test = require('node:test');
const {
  RosbagMessageDeserializationError,
  deserializeRosbagMessage,
  supportedRosbagMessageTypes,
} = require('../../app/domain/deserializeRosbagMessage');
const { CdrWriter } = require('../helpers/cdrWriter');

function deserialize(type, writer) {
  return deserializeRosbagMessage({
    data: writer.toBuffer(),
    serializationFormat: 'cdr',
    type,
  });
}

function writeTime(writer, { sec = 12, nanosec = 345 } = {}) {
  writer.writeInt32(sec);
  writer.writeUint32(nanosec);
}

function writeHeader(writer, { frameId = 'cam', sec = 12, nanosec = 345 } = {}) {
  writeTime(writer, { sec, nanosec });
  writer.writeString(frameId);
}

function writePoint(writer, { x = 1, y = 2, z = 3 } = {}) {
  writer.writeFloat64(x);
  writer.writeFloat64(y);
  writer.writeFloat64(z);
}

function writeQuaternion(writer, { x = 0, y = 0, z = 0, w = 1 } = {}) {
  writer.writeFloat64(x);
  writer.writeFloat64(y);
  writer.writeFloat64(z);
  writer.writeFloat64(w);
}

function writePose(writer) {
  writePoint(writer, { x: 1.5, y: 2.5, z: 3.5 });
  writeQuaternion(writer, { x: 0.1, y: 0.2, z: 0.3, w: 0.4 });
}

function writeParameterValue(writer, { type, bool = false, integer = 0n, double = 0, string = '', byteArray = [], boolArray = [], integerArray = [], doubleArray = [], stringArray = [] }) {
  writer.writeUint8(type);
  writer.writeBool(bool);
  writer.writeInt64(integer);
  writer.writeFloat64(double);
  writer.writeString(string);
  writer.writeByteSequence(byteArray);
  writer.writeSequence(boolArray, (value) => writer.writeBool(value));
  writer.writeSequence(integerArray, (value) => writer.writeInt64(value));
  writer.writeSequence(doubleArray, (value) => writer.writeFloat64(value));
  writer.writeSequence(stringArray, (value) => writer.writeString(value));
}

function writeParameter(writer, { name, value }) {
  writer.writeString(name);
  writeParameterValue(writer, value);
}

test('deserializes sensor_msgs/msg/Image with CDR alignment', () => {
  const writer = new CdrWriter();

  writeHeader(writer, { frameId: 'x' });
  writer.writeUint32(1);
  writer.writeUint32(2);
  writer.writeString('rgb8');
  writer.writeBool(false);
  writer.writeUint32(6);
  writer.writeByteSequence([1, 2, 3, 4, 5, 6]);

  const result = deserialize('sensor_msgs/msg/Image', writer);

  assert.deepEqual({ ...result, data: Array.from(result.data) }, {
    header: { stamp: { sec: 12, nanosec: 345 }, frameId: 'x' },
    height: 1,
    width: 2,
    encoding: 'rgb8',
    isBigendian: false,
    step: 6,
    data: [1, 2, 3, 4, 5, 6],
  });
});

test('deserializes big-endian CDR', () => {
  const writer = new CdrWriter({ littleEndian: false });

  writeHeader(writer, { frameId: '' });
  writer.writeUint32(1);
  writer.writeUint32(1);
  writer.writeString('mono8');
  writer.writeBool(false);
  writer.writeUint32(1);
  writer.writeByteSequence([42]);

  const result = deserialize('sensor_msgs/msg/Image', writer);

  assert.equal(result.width, 1);
  assert.equal(result.height, 1);
  assert.deepEqual(Array.from(result.data), [42]);
});

test('deserializes sensor_msgs/msg/CameraInfo', () => {
  const writer = new CdrWriter();

  writeHeader(writer, { frameId: 'cam' });
  writer.writeUint32(480);
  writer.writeUint32(640);
  writer.writeString('plumb_bob');
  writer.writeSequence([0.1, 0.2], (value) => writer.writeFloat64(value));
  writer.writeFixedArray([1, 2, 3, 4, 5, 6, 7, 8, 9], (value) => writer.writeFloat64(value));
  writer.writeFixedArray([9, 8, 7, 6, 5, 4, 3, 2, 1], (value) => writer.writeFloat64(value));
  writer.writeFixedArray(Array.from({ length: 12 }, (_, index) => index), (value) => writer.writeFloat64(value));
  writer.writeUint32(2);
  writer.writeUint32(3);
  writer.writeUint32(4);
  writer.writeUint32(5);
  writer.writeUint32(6);
  writer.writeUint32(7);
  writer.writeBool(true);

  const result = deserialize('sensor_msgs/msg/CameraInfo', writer);

  assert.deepEqual(result.d, [0.1, 0.2]);
  assert.deepEqual(result.k, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(result.p, Array.from({ length: 12 }, (_, index) => index));
  assert.deepEqual(result.roi, {
    xOffset: 4,
    yOffset: 5,
    height: 6,
    width: 7,
    doRectify: true,
  });
});

test('deserializes sensor_msgs/msg/CompressedImage', () => {
  const writer = new CdrWriter();

  writeHeader(writer);
  writer.writeString('rgb8; jpeg compressed bgr8');
  writer.writeByteSequence([0xff, 0xd8, 0xff]);

  const result = deserialize('sensor_msgs/msg/CompressedImage', writer);

  assert.equal(result.format, 'rgb8; jpeg compressed bgr8');
  assert.deepEqual(Array.from(result.data), [0xff, 0xd8, 0xff]);
});

test('deserializes sensor_msgs/msg/JointState', () => {
  const writer = new CdrWriter();

  writeHeader(writer);
  writer.writeSequence(['joint_a', 'joint_b'], (value) => writer.writeString(value));
  writer.writeSequence([1.5, 2.5], (value) => writer.writeFloat64(value));
  writer.writeSequence([3.5, 4.5], (value) => writer.writeFloat64(value));
  writer.writeSequence([], (value) => writer.writeFloat64(value));

  const result = deserialize('sensor_msgs/msg/JointState', writer);

  assert.deepEqual(result.name, ['joint_a', 'joint_b']);
  assert.deepEqual(result.position, [1.5, 2.5]);
  assert.deepEqual(result.velocity, [3.5, 4.5]);
  assert.deepEqual(result.effort, []);
});

test('deserializes geometry_msgs stamped types', () => {
  const poseWriter = new CdrWriter();
  writeHeader(poseWriter, { frameId: 'map' });
  writePose(poseWriter);

  const poseResult = deserialize('geometry_msgs/msg/PoseStamped', poseWriter);
  assert.deepEqual(poseResult.pose.position, { x: 1.5, y: 2.5, z: 3.5 });
  assert.deepEqual(poseResult.pose.orientation, { x: 0.1, y: 0.2, z: 0.3, w: 0.4 });

  const pointWriter = new CdrWriter();
  writeHeader(pointWriter, { frameId: 'odom' });
  writePoint(pointWriter, { x: 7, y: 8, z: 9 });

  const pointResult = deserialize('geometry_msgs/msg/PointStamped', pointWriter);
  assert.deepEqual(pointResult.point, { x: 7, y: 8, z: 9 });

  const covarianceWriter = new CdrWriter();
  writeHeader(covarianceWriter, { frameId: 'base_link' });
  writePose(covarianceWriter);
  covarianceWriter.writeFixedArray(
    Array.from({ length: 36 }, (_, index) => index / 10),
    (value) => covarianceWriter.writeFloat64(value),
  );

  const covarianceResult = deserialize('geometry_msgs/msg/PoseWithCovarianceStamped', covarianceWriter);
  assert.equal(covarianceResult.pose.covariance.length, 36);
  assert.equal(covarianceResult.pose.covariance[35], 3.5);
});

test('deserializes rcl_interfaces/msg/Log', () => {
  const writer = new CdrWriter();

  writeTime(writer, { sec: 123, nanosec: 456 });
  writer.writeUint8(20);
  writer.writeString('logger');
  writer.writeString('hello');
  writer.writeString('file.cpp');
  writer.writeString('function_name');
  writer.writeUint32(42);

  assert.deepEqual(deserialize('rcl_interfaces/msg/Log', writer), {
    stamp: { sec: 123, nanosec: 456 },
    level: 20,
    name: 'logger',
    message: 'hello',
    file: 'file.cpp',
    function: 'function_name',
    line: 42,
  });
});

test('deserializes rcl_interfaces/msg/ParameterEvent', () => {
  const writer = new CdrWriter();

  writeTime(writer);
  writer.writeString('/node');
  writer.writeSequence([{ name: 'enabled', value: { type: 1, bool: true } }], (value) => writeParameter(writer, value));
  writer.writeSequence([{ name: 'ids', value: { type: 7, integerArray: [10n, 20n] } }], (value) => writeParameter(writer, value));
  writer.writeSequence([], (value) => writeParameter(writer, value));

  const result = deserialize('rcl_interfaces/msg/ParameterEvent', writer);

  assert.deepEqual(result, {
    stamp: { sec: 12, nanosec: 345 },
    node: '/node',
    newParameters: [{
      name: 'enabled',
      value: { type: 1, typeName: 'BOOL', value: true },
    }],
    changedParameters: [{
      name: 'ids',
      value: { type: 7, typeName: 'INTEGER_ARRAY', value: ['10', '20'] },
    }],
    deletedParameters: [],
  });
});

test('deserializes theora_image_transport/msg/Packet', () => {
  const writer = new CdrWriter();

  writeHeader(writer);
  writer.writeByteSequence([1, 2, 3]);
  writer.writeInt32(1);
  writer.writeInt32(0);
  writer.writeInt64(9_007_199_254_740_993n);
  writer.writeInt64(12n);

  const result = deserialize('theora_image_transport/msg/Packet', writer);

  assert.equal(result.bOs, 1);
  assert.equal(result.eOs, 0);
  assert.equal(result.granulepos, '9007199254740993');
  assert.equal(result.packetno, '12');
  assert.deepEqual(Array.from(result.data), [1, 2, 3]);
});

test('deserializes both WriteSplitEvent schema variants', () => {
  const legacyWriter = new CdrWriter();
  legacyWriter.writeString('closed.db3');
  legacyWriter.writeString('opened.db3');

  assert.deepEqual(deserialize('rosbag2_interfaces/msg/WriteSplitEvent', legacyWriter), {
    closedFile: 'closed.db3',
    openedFile: 'opened.db3',
    nodeName: null,
  });

  const currentWriter = new CdrWriter();
  currentWriter.writeString('closed.db3');
  currentWriter.writeString('opened.db3');
  currentWriter.writeString('/recorder');

  assert.deepEqual(deserialize('rosbag2_interfaces/msg/WriteSplitEvent', currentWriter), {
    closedFile: 'closed.db3',
    openedFile: 'opened.db3',
    nodeName: '/recorder',
  });
});

test('reports unsupported formats, types, and malformed CDR data', () => {
  assert.equal(supportedRosbagMessageTypes.length, 11);

  assert.throws(
    () => deserializeRosbagMessage({
      data: Buffer.alloc(0),
      serializationFormat: 'mcap',
      type: 'sensor_msgs/msg/Image',
    }),
    (error) => error instanceof RosbagMessageDeserializationError
      && error.code === 'UNSUPPORTED_ROSBAG_SERIALIZATION_FORMAT',
  );

  assert.throws(
    () => deserializeRosbagMessage({
      data: Buffer.alloc(0),
      serializationFormat: 'cdr',
      type: 'example_msgs/msg/Unknown',
    }),
    (error) => error instanceof RosbagMessageDeserializationError
      && error.code === 'UNSUPPORTED_ROSBAG_TOPIC_TYPE',
  );

  assert.throws(
    () => deserializeRosbagMessage({
      data: Buffer.from([0x00, 0x01, 0x00, 0x00]),
      serializationFormat: 'cdr',
      type: 'sensor_msgs/msg/Image',
    }),
    (error) => error instanceof RosbagMessageDeserializationError
      && error.code === 'MALFORMED_CDR_MESSAGE',
  );
});
