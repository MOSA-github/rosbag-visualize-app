const BYTE_PREVIEW_LENGTH = 32;

function getTopicData(topicDataById, topicId) {
  if (topicDataById instanceof Map) {
    return topicDataById.get(topicId);
  }

  return topicDataById?.[topicId] ?? null;
}

function summarizeUint8Array(bytes) {
  const preview = Array.from(bytes.subarray(0, BYTE_PREVIEW_LENGTH));

  return {
    $type: 'Uint8Array',
    byteLength: bytes.byteLength,
    preview,
    truncated: bytes.byteLength > BYTE_PREVIEW_LENGTH,
  };
}

function prepareForJson(value, seen = new WeakSet()) {
  // 画像などの巨大なバイト列は先頭だけを表示する。
  if (value instanceof Uint8Array) {
    return summarizeUint8Array(value);
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => prepareForJson(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, prepareForJson(item, seen)]),
  );
}

function formatDecodedData(data) {
  try {
    return JSON.stringify(prepareForJson(data), null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    return `データを表示用JSONへ変換できませんでした: ${message}`;
  }
}

function TopicMetadata({ topic }) {
  return (
    <dl className="raw-topic-data-metadata">
      <div>
        <dt>名前</dt>
        <dd title={topic.name}>{topic.name}</dd>
      </div>
      <div>
        <dt>型</dt>
        <dd title={topic.type}>{topic.type}</dd>
      </div>
      <div>
        <dt>シリアライズ形式</dt>
        <dd>{topic.serializationFormat ?? '未指定'}</dd>
      </div>
    </dl>
  );
}

function RawTopicDataView({ selectedTopics = [], topicDataById = {} }) {
  if (selectedTopics.length === 0) {
    return (
      <section className="raw-topic-data-view" aria-labelledby="raw-topic-data-heading">
        <h2 id="raw-topic-data-heading">トピックの生データ</h2>
        <p className="raw-topic-data-hint">各トピックの先頭1件を表示します。</p>
        <p className="raw-topic-data-empty">表示するトピックを選択してください。</p>
      </section>
    );
  }

  return (
    <section className="raw-topic-data-view" aria-labelledby="raw-topic-data-heading">
      <h2 id="raw-topic-data-heading">トピックの生データ</h2>
      <p className="raw-topic-data-hint">
        各トピックの先頭1件を表示します。バイト列はサイズと先頭32バイトへ要約しています。
      </p>
      <div className="raw-topic-data-list">
        {selectedTopics.map((selectedTopic) => {
          const topicData = getTopicData(topicDataById, selectedTopic.id);
          const status = topicData?.status ?? 'loading';
          const result = topicData?.result ?? topicData;
          const topic = result?.topic ?? selectedTopic;
          const messages = Array.isArray(result?.messages) ? result.messages : [];
          const topicHeadingId = `raw-topic-data-topic-${selectedTopic.id}`;

          return (
            <article key={selectedTopic.id} className="raw-topic-data-topic" aria-labelledby={topicHeadingId}>
              <header className="raw-topic-data-topic-header">
                <h3 id={topicHeadingId}>{topic.name}</h3>
                <TopicMetadata topic={topic} />
              </header>

              {status === 'loading' && (
                <p className="raw-topic-data-status" role="status">トピックデータを読み込んでいます…</p>
              )}

              {status === 'error' && (
                <p className="raw-topic-data-error" role="alert">
                  トピックデータを読み込めませんでした: {topicData.error || '不明なエラー'}
                </p>
              )}

              {status === 'ready' && messages.length === 0 && (
                <p className="raw-topic-data-empty">このトピックにはメッセージがありません。</p>
              )}

              {status === 'ready' && messages.length > 0 && (
                <ol className="raw-topic-data-messages">
                  {messages.map((message, index) => (
                    <li key={message.id ?? index} className="raw-topic-data-message">
                      <dl className="raw-topic-data-message-metadata">
                        <div>
                          <dt>Message ID</dt>
                          <dd>{message.id ?? '未指定'}</dd>
                        </div>
                        <div>
                          <dt>Timestamp (ns)</dt>
                          <dd>{message.timestampNs ?? '未指定'}</dd>
                        </div>
                      </dl>
                      <pre className="raw-topic-data-json">{formatDecodedData(message.data)}</pre>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default RawTopicDataView;
