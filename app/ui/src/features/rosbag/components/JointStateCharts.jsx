import { useMemo } from 'react';
import { buildJointStateSeries, JOINT_STATE_MESSAGE_TYPE } from '../model/jointStateSeries.mjs';
import JointStateChart from './JointStateChart';

function getTopicData(topicDataById, topicId) {
  if (topicDataById instanceof Map) {
    return topicDataById.get(topicId);
  }

  return topicDataById?.[topicId] ?? null;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0 秒';
  }

  if (seconds >= 60) {
    return `${Number((seconds / 60).toFixed(2))} 分`;
  }

  return `${Number(seconds.toFixed(3))} 秒`;
}

function JointStateTopicCharts({ topic, topicData }) {
  const status = topicData?.status ?? 'loading';
  const result = topicData?.result ?? topicData;
  const messages = Array.isArray(result?.messages) ? result.messages : [];
  const chartData = useMemo(() => buildJointStateSeries(messages), [messages]);

  return (
    <article className="joint-state-topic" aria-labelledby={`joint-state-topic-${topic.id}`}>
      <header className="joint-state-topic-header">
        <div>
          <h3 id={`joint-state-topic-${topic.id}`} title={topic.name}>{topic.name}</h3>
          <p>{topic.type}</p>
        </div>
        {status === 'ready' && (
          <span className="joint-state-topic-summary">
            {messages.length} messages · {chartData.joints.length} joints · {formatDuration(chartData.durationSeconds)}
          </span>
        )}
      </header>

      {status === 'loading' && <p className="joint-state-status" role="status">JointState データを読み込んでいます…</p>}
      {status === 'error' && (
        <p className="joint-state-error" role="alert">
          JointState データを読み込めませんでした: {topicData.error || '不明なエラー'}
        </p>
      )}
      {status === 'ready' && chartData.joints.length === 0 && (
        <p className="joint-state-status">グラフ化できる JointState データがありません。</p>
      )}
      {status === 'ready' && chartData.joints.length > 0 && (
        <div className="joint-state-chart-list">
          {chartData.joints.map((joint) => (
            <JointStateChart key={joint.name} durationSeconds={chartData.durationSeconds} joint={joint} />
          ))}
        </div>
      )}
    </article>
  );
}

function JointStateCharts({ selectedTopics = [], topicDataById = {} }) {
  const jointStateTopics = selectedTopics.filter(({ type }) => type === JOINT_STATE_MESSAGE_TYPE);

  if (jointStateTopics.length === 0) {
    return null;
  }

  return (
    <section className="joint-state-charts" aria-labelledby="joint-state-charts-heading">
      <header className="joint-state-charts-header">
        <div>
          <h2 id="joint-state-charts-heading">JointState グラフ</h2>
          <p>関節ごとに position、velocity、effort を、最初のメッセージからの経過時間で表示します。</p>
        </div>
        <span>最大 100 messages</span>
      </header>
      <div className="joint-state-topic-list">
        {jointStateTopics.map((topic) => (
          <JointStateTopicCharts
            key={topic.id}
            topic={topic}
            topicData={getTopicData(topicDataById, topic.id)}
          />
        ))}
      </div>
    </section>
  );
}

export default JointStateCharts;
