import { useId } from 'react';
import { JOINT_STATE_METRICS } from '../model/jointStateSeries.mjs';

const CHART_WIDTH = 360;
const CHART_HEIGHT = 220;
const PLOT = {
  bottom: 31,
  left: 45,
  right: 14,
  top: 16,
};
const MAX_RENDERED_POINTS = 600;

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (value === 0) {
    return '0';
  }

  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 10_000 || absoluteValue < 0.001) {
    return value.toExponential(2);
  }

  return Number(value.toPrecision(4)).toString();
}

function formatSeconds(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Number(value.toFixed(value < 10 ? 3 : 1)).toString();
}

function downsample(points) {
  if (points.length <= MAX_RENDERED_POINTS) {
    return points;
  }

  const sampledPoints = [];
  const step = (points.length - 1) / (MAX_RENDERED_POINTS - 1);

  for (let index = 0; index < MAX_RENDERED_POINTS; index += 1) {
    sampledPoints.push(points[Math.round(index * step)]);
  }

  return sampledPoints;
}

function getValueDomain(points) {
  const values = points.map(({ value }) => value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  if (minimum === maximum) {
    const padding = minimum === 0 ? 1 : Math.abs(minimum) * 0.1;
    return { minimum: minimum - padding, maximum: maximum + padding };
  }

  const padding = (maximum - minimum) * 0.08;
  return { minimum: minimum - padding, maximum: maximum + padding };
}

function createLinePath(points, valueDomain, durationSeconds) {
  const plotWidth = CHART_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const timeRange = durationSeconds > 0 ? durationSeconds : 1;
  const valueRange = valueDomain.maximum - valueDomain.minimum;

  return downsample(points).map((point, index) => {
    const x = PLOT.left + (Math.max(0, Math.min(point.timeSeconds, timeRange)) / timeRange) * plotWidth;
    const y = PLOT.top + (1 - ((point.value - valueDomain.minimum) / valueRange)) * plotHeight;

    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function MetricChart({ durationSeconds, metric, points }) {
  if (points.length === 0) {
    return (
      <section className="joint-state-metric-chart joint-state-metric-chart-empty">
        <header className="joint-state-metric-chart-header">
          <strong className={`joint-state-metric-name ${metric.colorClassName}`}>{metric.label}</strong>
        </header>
        <p>この関節には {metric.label} の値が記録されていません。</p>
      </section>
    );
  }

  const valueDomain = getValueDomain(points);
  const linePath = createLinePath(points, valueDomain, durationSeconds);
  const plotBottom = CHART_HEIGHT - PLOT.bottom;
  const plotRight = CHART_WIDTH - PLOT.right;
  const plotHeight = plotBottom - PLOT.top;
  const lastValue = points.at(-1)?.value;

  return (
    <section className="joint-state-metric-chart">
      <header className="joint-state-metric-chart-header">
        <strong className={`joint-state-metric-name ${metric.colorClassName}`}>{metric.label}</strong>
        <span>{points.length} samples · last {formatNumber(lastValue)}</span>
      </header>
      <svg
        className="joint-state-line-chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`${metric.label} の時系列グラフ。${points.length} 件の値を表示しています。`}
      >
        <title>{metric.label} time series</title>
        {[0, 0.5, 1].map((ratio) => {
          const y = PLOT.top + ratio * plotHeight;
          const value = valueDomain.maximum - ratio * (valueDomain.maximum - valueDomain.minimum);

          return (
            <g key={ratio}>
              <line className="joint-state-grid-line" x1={PLOT.left} x2={plotRight} y1={y} y2={y} />
              <text className="joint-state-axis-label" x={PLOT.left - 7} y={y + 3} textAnchor="end">
                {formatNumber(value)}
              </text>
            </g>
          );
        })}
        <line className="joint-state-axis-line" x1={PLOT.left} x2={plotRight} y1={plotBottom} y2={plotBottom} />
        <path className={`joint-state-line ${metric.colorClassName}`} d={linePath} />
        <text className="joint-state-axis-label" x={PLOT.left} y={CHART_HEIGHT - 8}>0 s</text>
        <text className="joint-state-axis-label" x={plotRight} y={CHART_HEIGHT - 8} textAnchor="end">
          {formatSeconds(durationSeconds)} s
        </text>
      </svg>
    </section>
  );
}

function JointStateChart({ durationSeconds, joint }) {
  const headingId = useId();

  return (
    <article className="joint-state-chart" aria-labelledby={headingId}>
      <header className="joint-state-chart-header">
        <h4 id={headingId} title={joint.name}>{joint.name}</h4>
        <span>time from first message</span>
      </header>
      <div className="joint-state-metric-grid">
        {JOINT_STATE_METRICS.map((metric) => (
          <MetricChart
            key={metric.key}
            durationSeconds={durationSeconds}
            metric={metric}
            points={joint.series[metric.key]}
          />
        ))}
      </div>
    </article>
  );
}

export default JointStateChart;
