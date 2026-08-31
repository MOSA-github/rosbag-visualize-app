const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const {
  RosbagTopicMessagesError,
  getRosbagTopicMessages,
  getRosbagTopicMetadata,
} = require('../../app/domain/getRosbagTopicMessages');
const { CdrWriter } = require('../helpers/cdrWriter');

function createImageData(pixel) {
  const writer = new CdrWriter();

  writer.writeInt32(100);
  writer.writeUint32(200);
  writer.writeString('camera');
  writer.writeUint32(1);
  writer.writeUint32(1);
  writer.writeString('mono8');
  writer.writeBool(false);
  writer.writeUint32(1);
  writer.writeByteSequence([pixel]);

  return writer.toBuffer();
}

function createRosbagDatabase(t) {
  const directory = mkdtempSync(join(tmpdir(), 'rosbag-topic-messages-'));
  const databasePath = join(directory, 'sample.db3');
  const database = new DatabaseSync(databasePath);

  t.after(() => rmSync(directory, { force: true, recursive: true }));

  try {
    database.exec(`
      CREATE TABLE topics (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        serialization_format TEXT NOT NULL,
        offered_qos_profiles TEXT NOT NULL
      );
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY,
        topic_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        data BLOB NOT NULL
      );
    `);

    database.prepare(`
      INSERT INTO topics (id, name, type, serialization_format, offered_qos_profiles)
      VALUES (?, ?, ?, ?, ?)
    `).run(1, '/camera/image', 'sensor_msgs/msg/Image', 'cdr', '');
    database.prepare(`
      INSERT INTO topics (id, name, type, serialization_format, offered_qos_profiles)
      VALUES (?, ?, ?, ?, ?)
    `).run(2, '/empty', 'sensor_msgs/msg/CameraInfo', 'cdr', '');

    const insertMessage = database.prepare(`
      INSERT INTO messages (id, topic_id, timestamp, data)
      VALUES (?, ?, ?, ?)
    `);
    insertMessage.run(10, 1, 1_768_112_413_488_723_168n, createImageData(10));
    insertMessage.run(11, 1, 1_768_112_413_488_723_169n, createImageData(11));
  } finally {
    database.close();
  }

  return databasePath;
}

test('gets selected topic metadata and a deserialized message page', (t) => {
  const databasePath = createRosbagDatabase(t);

  assert.deepEqual(getRosbagTopicMetadata(databasePath, 1), {
    id: 1,
    name: '/camera/image',
    type: 'sensor_msgs/msg/Image',
    serializationFormat: 'cdr',
  });

  const result = getRosbagTopicMessages(databasePath, 1, { limit: 1, offset: 1 });

  assert.deepEqual(result.topic, {
    id: 1,
    name: '/camera/image',
    type: 'sensor_msgs/msg/Image',
    serializationFormat: 'cdr',
  });
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].id, 11);
  assert.equal(result.messages[0].timestampNs, '1768112413488723169');
  assert.equal(result.messages[0].data.header.frameId, 'camera');
  assert.deepEqual(Array.from(result.messages[0].data.data), [11]);
});

test('returns an empty page for a topic that has no messages', (t) => {
  const databasePath = createRosbagDatabase(t);
  const result = getRosbagTopicMessages(databasePath, 2);

  assert.equal(result.topic.type, 'sensor_msgs/msg/CameraInfo');
  assert.deepEqual(result.messages, []);
});

test('reports an unavailable topic ID', (t) => {
  const databasePath = createRosbagDatabase(t);

  assert.throws(
    () => getRosbagTopicMessages(databasePath, 99),
    (error) => error instanceof RosbagTopicMessagesError
      && error.code === 'ROSBAG_TOPIC_NOT_FOUND',
  );
});
