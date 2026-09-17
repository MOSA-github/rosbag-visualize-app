export const JOINT_STATE_MESSAGE_TYPE = 'sensor_msgs/msg/JointState';

export const JOINT_STATE_METRICS = Object.freeze([
  { key: 'position', label: 'position', colorClassName: 'is-position' },
  { key: 'velocity', label: 'velocity', colorClassName: 'is-velocity' },
  { key: 'effort', label: 'effort', colorClassName: 'is-effort' },
]);

const NANOSECONDS_PER_SECOND = 1_000_000_000n;

function toTimestampNs(value) {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return BigInt(value);
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }

  return null;
}

function toJointName(value, index) {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }

  return `joint_${index + 1}`;
}

function createJointSeries(name) {
  return {
    name,
    series: {
      position: [],
      velocity: [],
      effort: [],
    },
  };
}

/**
 * JointState の各配列を joint name ごとの時系列へ変換する。
 * timestampNs は 64 bit 整数なので、最初の時刻との差分を秒へ変換して扱う。
 */
export function buildJointStateSeries(messages) {
  const sourceMessages = Array.isArray(messages) ? messages : [];
  const timestampEntries = sourceMessages
    .map((message) => toTimestampNs(message?.timestampNs))
    .filter((timestamp) => timestamp !== null);

  if (timestampEntries.length === 0) {
    return {
      durationSeconds: 0,
      endTimestampNs: null,
      joints: [],
      startTimestampNs: null,
    };
  }

  const startTimestamp = timestampEntries[0];
  const endTimestamp = timestampEntries.reduce(
    (latestTimestamp, timestamp) => (timestamp > latestTimestamp ? timestamp : latestTimestamp),
    startTimestamp,
  );
  const jointsByName = new Map();

  sourceMessages.forEach((message) => {
    const timestamp = toTimestampNs(message?.timestampNs);
    const jointState = message?.data;

    if (timestamp === null || !Array.isArray(jointState?.name)) {
      return;
    }

    const timeSeconds = Number(timestamp - startTimestamp) / Number(NANOSECONDS_PER_SECOND);

    if (!Number.isFinite(timeSeconds)) {
      return;
    }

    jointState.name.forEach((rawJointName, jointIndex) => {
      const jointName = toJointName(rawJointName, jointIndex);
      let joint = jointsByName.get(jointName);

      if (!joint) {
        joint = createJointSeries(jointName);
        jointsByName.set(jointName, joint);
      }

      JOINT_STATE_METRICS.forEach(({ key }) => {
        const value = jointState[key]?.[jointIndex];

        if (Number.isFinite(value)) {
          joint.series[key].push({ timeSeconds, value });
        }
      });
    });
  });

  return {
    durationSeconds: Number(endTimestamp - startTimestamp) / Number(NANOSECONDS_PER_SECOND),
    endTimestampNs: endTimestamp.toString(),
    joints: Array.from(jointsByName.values()),
    startTimestampNs: startTimestamp.toString(),
  };
}
