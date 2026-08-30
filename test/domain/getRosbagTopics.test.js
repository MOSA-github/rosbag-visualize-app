const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');
const { DatabaseSync } = require('node:sqlite');
const { getRosbagTopics, RosbagTopicsError } = require('../../app/domain/getRosbagTopics');

function createRosbagDatabase(t, topics) {
  const directory = mkdtempSync(join(tmpdir(), 'rosbag-topics-'));
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
      )
    `);

    const insertTopic = database.prepare(`
      INSERT INTO topics (id, name, type, serialization_format, offered_qos_profiles)
      VALUES (?, ?, ?, ?, ?)
    `);

    topics.forEach((topic) => {
      insertTopic.run(
        topic.id,
        topic.name,
        topic.type,
        topic.serializationFormat,
        '',
      );
    });
  } finally {
    database.close();
  }

  return databasePath;
}

test('getRosbagTopics returns topics in ID order with UI-friendly keys', (t) => {
  const databasePath = createRosbagDatabase(t, [
    {
      id: 8,
      name: '/camera/image_raw',
      type: 'sensor_msgs/msg/Image',
      serializationFormat: 'cdr',
    },
    {
      id: 2,
      name: '/imu/data',
      type: 'sensor_msgs/msg/Imu',
      serializationFormat: 'cdr',
    },
  ]);

  assert.deepEqual(getRosbagTopics(databasePath), [
    {
      id: 2,
      name: '/imu/data',
      type: 'sensor_msgs/msg/Imu',
      serializationFormat: 'cdr',
    },
    {
      id: 8,
      name: '/camera/image_raw',
      type: 'sensor_msgs/msg/Image',
      serializationFormat: 'cdr',
    },
  ]);
});

test('getRosbagTopics reports an invalid path without opening a database', () => {
  assert.throws(
    () => getRosbagTopics(''),
    (error) => error instanceof RosbagTopicsError && error.code === 'INVALID_ROSBAG_PATH',
  );
});

test('getRosbagTopics reports an unreadable rosbag database', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'rosbag-topics-'));
  const invalidDatabasePath = join(directory, 'invalid.db3');

  t.after(() => rmSync(directory, { force: true, recursive: true }));
  writeFileSync(invalidDatabasePath, 'not a sqlite database');

  assert.throws(
    () => getRosbagTopics(invalidDatabasePath),
    (error) => error instanceof RosbagTopicsError && error.code === 'ROSBAG_TOPICS_READ_FAILED',
  );
});
