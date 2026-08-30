const assert = require('node:assert/strict');
const test = require('node:test');
const { selectRosbagFile } = require('../../app/application/selectRosbagFile');

test('selectRosbagFile returns null when the file dialog is cancelled', async () => {
  let getTopicsWasCalled = false;

  const result = await selectRosbagFile({}, {
    getTopics: () => {
      getTopicsWasCalled = true;
      return [];
    },
    showFileDialog: async () => null,
  });

  assert.equal(result, null);
  assert.equal(getTopicsWasCalled, false);
});

test('selectRosbagFile returns the selected file and its db3 topics', async () => {
  const parentWindow = { id: 1 };
  const filePath = 'C:\\bags\\recording.db3';
  const topics = [
    {
      id: 3,
      name: '/scan',
      type: 'sensor_msgs/msg/LaserScan',
      serializationFormat: 'cdr',
    },
  ];
  let receivedParentWindow;
  let receivedPath;

  const result = await selectRosbagFile(parentWindow, {
    getTopics: (path) => {
      receivedPath = path;
      return topics;
    },
    showFileDialog: async (window) => {
      receivedParentWindow = window;
      return filePath;
    },
  });

  assert.equal(receivedParentWindow, parentWindow);
  assert.equal(receivedPath, filePath);
  assert.deepEqual(result, {
    name: 'recording.db3',
    path: filePath,
    topics,
  });
});
