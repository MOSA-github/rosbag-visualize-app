const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

class RosbagTopicsError extends Error {
  constructor(message, code, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'RosbagTopicsError';
    this.code = code;
  }
}

/**
 * ROS 2 のrosbag(.db3)から、トピック情報を取得する。
 *
 * @param {string} db3FilePath
 * @returns {{ id: number, name: string, type: string, serializationFormat: string }[]}
 */
function getRosbagTopics(db3FilePath) {
  if (typeof db3FilePath !== 'string' || db3FilePath.trim() === '') {
    throw new RosbagTopicsError(
      'rosbagファイルのパスを指定してください。',
      'INVALID_ROSBAG_PATH',
    );
  }

  let fileStats;

  try {
    fileStats = fs.statSync(db3FilePath);
  } catch (error) {
    const code = error?.code === 'ENOENT'
      ? 'ROSBAG_FILE_NOT_FOUND'
      : 'ROSBAG_FILE_ACCESS_FAILED';

    throw new RosbagTopicsError(
      'rosbagファイルを確認できませんでした。',
      code,
      error,
    );
  }

  if (!fileStats.isFile()) {
    throw new RosbagTopicsError(
      'rosbagファイルではないパスが指定されました。',
      'ROSBAG_PATH_IS_NOT_FILE',
    );
  }

  let database;

  try {
    // 選択されたrosbagを変更しないよう、必ず読み取り専用で開く。
    database = new DatabaseSync(db3FilePath, { readOnly: true });
    const rows = database.prepare(`
      SELECT id, name, type, serialization_format
      FROM topics
      ORDER BY id
    `).all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      serializationFormat: row.serialization_format,
    }));
  } catch (error) {
    throw new RosbagTopicsError(
      'rosbagファイルからトピック一覧を読み取れませんでした。',
      'ROSBAG_TOPICS_READ_FAILED',
      error,
    );
  } finally {
    database?.close();
  }
}

module.exports = { getRosbagTopics, RosbagTopicsError };
