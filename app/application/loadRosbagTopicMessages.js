const { getRosbagTopicMessages } = require('../domain/getRosbagTopicMessages');

/**
 * UIで選択されたトピックのデシリアライズ済みメッセージを読み込む。
 */
function loadRosbagTopicMessages(
  db3FilePath,
  topicId,
  options,
  { getMessages = getRosbagTopicMessages } = {},
) {
  return getMessages(db3FilePath, topicId, options);
}

module.exports = { loadRosbagTopicMessages };
