const assert = require('node:assert/strict');
const test = require('node:test');
const {
  loadRosbagTopicMessages,
} = require('../../app/application/loadRosbagTopicMessages');

test('loadRosbagTopicMessages delegates the selected topic to the domain layer', () => {
  const expected = {
    topic: { id: 2, name: '/image', type: 'sensor_msgs/msg/Image', serializationFormat: 'cdr' },
    messages: [],
  };
  let receivedArguments;

  const result = loadRosbagTopicMessages('C:\\bags\\sample.db3', 2, { limit: 1 }, {
    getMessages: (...arguments_) => {
      receivedArguments = arguments_;
      return expected;
    },
  });

  assert.deepEqual(receivedArguments, ['C:\\bags\\sample.db3', 2, { limit: 1 }]);
  assert.equal(result, expected);
});

test('loadRosbagTopicMessages preserves a domain error', () => {
  const expectedError = new Error('未対応のROSメッセージ型です。');

  assert.throws(
    () => loadRosbagTopicMessages('C:\\bags\\sample.db3', 2, undefined, {
      getMessages: () => {
        throw expectedError;
      },
    }),
    (error) => error === expectedError,
  );
});
