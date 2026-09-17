import assert from 'node:assert/strict';
import test from 'node:test';
import {
  JOINT_STATE_MESSAGE_TYPE,
  buildJointStateSeries,
} from '../../App/ui/src/features/rosbag/model/jointStateSeries.mjs';

test('buildJointStateSeries groups every JointState array by joint name and timestamp', () => {
  const result = buildJointStateSeries([
    {
      timestampNs: '1000000000',
      data: {
        name: ['left_wheel', 'right_wheel'],
        position: [1, 2],
        velocity: [3, 4],
        effort: [5, 6],
      },
    },
    {
      timestampNs: '2500000000',
      data: {
        name: ['right_wheel', 'left_wheel'],
        position: [20, 10],
        velocity: [40, 30],
        effort: [],
      },
    },
  ]);

  assert.equal(JOINT_STATE_MESSAGE_TYPE, 'sensor_msgs/msg/JointState');
  assert.equal(result.startTimestampNs, '1000000000');
  assert.equal(result.endTimestampNs, '2500000000');
  assert.equal(result.durationSeconds, 1.5);
  assert.deepEqual(result.joints, [
    {
      name: 'left_wheel',
      series: {
        position: [{ timeSeconds: 0, value: 1 }, { timeSeconds: 1.5, value: 10 }],
        velocity: [{ timeSeconds: 0, value: 3 }, { timeSeconds: 1.5, value: 30 }],
        effort: [{ timeSeconds: 0, value: 5 }],
      },
    },
    {
      name: 'right_wheel',
      series: {
        position: [{ timeSeconds: 0, value: 2 }, { timeSeconds: 1.5, value: 20 }],
        velocity: [{ timeSeconds: 0, value: 4 }, { timeSeconds: 1.5, value: 40 }],
        effort: [{ timeSeconds: 0, value: 6 }],
      },
    },
  ]);
});

test('buildJointStateSeries skips unavailable values and gives unnamed joints a stable label', () => {
  const result = buildJointStateSeries([
    {
      timestampNs: '0',
      data: {
        name: ['', 'arm'],
        position: [Number.NaN, 1],
        velocity: [],
        effort: [2, Number.POSITIVE_INFINITY],
      },
    },
  ]);

  assert.deepEqual(result.joints, [
    {
      name: 'joint_1',
      series: {
        position: [],
        velocity: [],
        effort: [{ timeSeconds: 0, value: 2 }],
      },
    },
    {
      name: 'arm',
      series: {
        position: [{ timeSeconds: 0, value: 1 }],
        velocity: [],
        effort: [],
      },
    },
  ]);
});
