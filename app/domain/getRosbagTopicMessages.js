const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const {
  RosbagMessageDeserializationError,
  deserializeRosbagMessage,
} = require('./deserializeRosbagMessage');

const MAX_MESSAGE_PAGE_SIZE = 100;

class RosbagTopicMessagesError extends Error {
  constructor(message, code, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'RosbagTopicMessagesError';
    this.code = code;
  }
}

function validateRosbagFilePath(db3FilePath) {
  if (typeof db3FilePath !== 'string' || db3FilePath.trim() === '') {
    throw new RosbagTopicMessagesError(
      'rosbagファイルのパスを指定してください。',
      'INVALID_ROSBAG_PATH',
    );
  }

  try {
    const fileStats = fs.statSync(db3FilePath);

    if (!fileStats.isFile()) {
      throw new RosbagTopicMessagesError(
        'rosbagファイルではないパスが指定されました。',
        'ROSBAG_PATH_IS_NOT_FILE',
      );
    }
  } catch (error) {
    if (error instanceof RosbagTopicMessagesError) {
      throw error;
    }

    const code = error?.code === 'ENOENT'
      ? 'ROSBAG_FILE_NOT_FOUND'
      : 'ROSBAG_FILE_ACCESS_FAILED';

    throw new RosbagTopicMessagesError(
      'rosbagファイルを確認できませんでした。',
      code,
      error,
    );
  }
}

function validateTopicId(topicId) {
  if (!Number.isInteger(topicId) || topicId < 1) {
    throw new RosbagTopicMessagesError(
      'トピックIDは1以上の整数で指定してください。',
      'INVALID_ROSBAG_TOPIC_ID',
    );
  }
}

function normalizePageOptions({ limit = 1, offset = 0 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_MESSAGE_PAGE_SIZE) {
    throw new RosbagTopicMessagesError(
      `取得件数は1から${MAX_MESSAGE_PAGE_SIZE}の整数で指定してください。`,
      'INVALID_ROSBAG_MESSAGE_LIMIT',
    );
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new RosbagTopicMessagesError(
      '取得開始位置は0以上の整数で指定してください。',
      'INVALID_ROSBAG_MESSAGE_OFFSET',
    );
  }

  return { limit, offset };
}

function toTopicMetadata(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    serializationFormat: row.serialization_format,
  };
}

function findTopic(database, topicId) {
  const row = database.prepare(`
    SELECT id, name, type, serialization_format
    FROM topics
    WHERE id = ?
  `).get(topicId);

  if (!row) {
    throw new RosbagTopicMessagesError(
      '指定されたトピックがrosbag内に見つかりません。',
      'ROSBAG_TOPIC_NOT_FOUND',
    );
  }

  return toTopicMetadata(row);
}

function withRosbagDatabase(db3FilePath, callback) {
  validateRosbagFilePath(db3FilePath);
  let database;

  try {
    // メッセージ読込中も、元のrosbagを変更しない。
    database = new DatabaseSync(db3FilePath, { readOnly: true });
    return callback(database);
  } catch (error) {
    if (
      error instanceof RosbagTopicMessagesError
      || error instanceof RosbagMessageDeserializationError
    ) {
      throw error;
    }

    throw new RosbagTopicMessagesError(
      'rosbagファイルからトピックメッセージを読み取れませんでした。',
      'ROSBAG_TOPIC_MESSAGES_READ_FAILED',
      error,
    );
  } finally {
    database?.close();
  }
}

/**
 * 選択されたトピックの型・シリアライズ形式をdb3から取得する。
 */
function getRosbagTopicMetadata(db3FilePath, topicId) {
  validateTopicId(topicId);

  return withRosbagDatabase(db3FilePath, (database) => findTopic(database, topicId));
}

/**
 * 選択トピックのメッセージをページ単位で読み、型に応じてデシリアライズする。
 */
function getRosbagTopicMessages(db3FilePath, topicId, options) {
  validateTopicId(topicId);
  const { limit, offset } = normalizePageOptions(options);

  return withRosbagDatabase(db3FilePath, (database) => {
    const topic = findTopic(database, topicId);
    const rows = database.prepare(`
      SELECT
        id,
        CAST(timestamp AS TEXT) AS timestamp_ns,
        data
      FROM messages
      WHERE topic_id = ?
      ORDER BY timestamp, id
      LIMIT ? OFFSET ?
    `).all(topicId, limit, offset);

    return {
      topic,
      messages: rows.map((row) => ({
        id: row.id,
        // SQLiteの64-bit nanosecond timestampはNumberにせず文字列で保持する。
        timestampNs: String(row.timestamp_ns),
        data: deserializeRosbagMessage({
          data: row.data,
          serializationFormat: topic.serializationFormat,
          type: topic.type,
        }),
      })),
    };
  });
}

module.exports = {
  MAX_MESSAGE_PAGE_SIZE,
  RosbagTopicMessagesError,
  getRosbagTopicMessages,
  getRosbagTopicMetadata,
};
