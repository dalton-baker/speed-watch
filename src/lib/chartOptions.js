const FAILURE_COLOR = '#ef4444';
const SKIPPED_COLOR = '#f59e0b';
const PARTIAL_COLOR = '#a855f7';
const TIMEOUT_COLOR = '#f97316';

function statusColor(status) {
  switch (status) {
    case 'failed': return FAILURE_COLOR;
    case 'timeout': return TIMEOUT_COLOR;
    case 'partial': return PARTIAL_COLOR;
    case 'skipped': return SKIPPED_COLOR;
    default: return FAILURE_COLOR;
  }
}

const TIME_AXIS_FORMATTER = {
  hour: '{h}:{mm}{a}',
  minute: '{h}:{mm}{a}'
};

export function buildSeriesOption({ runs, valueField, name, color, unit }) {
  const data = runs.map((r) => {
    const v = r[valueField];
    if (r.status === 'success' && v != null && Number.isFinite(v)) {
      return [r.startedAt, v];
    }
    return [r.startedAt, null];
  });

  const failureMarks = runs
    .filter((r) => r.status !== 'success')
    .map((r) => ({
      xAxis: r.startedAt,
      itemStyle: { color: statusColor(r.status) },
      label: { show: false }
    }));

  return {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 30, bottom: 40, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0' },
      formatter: (params) => {
        if (!params || !params.length) return '';
        const p = params[0];
        const d = new Date(p.value[0]).toLocaleString();
        const val = p.value[1] == null ? '—' : `${p.value[1].toFixed(2)} ${unit}`;
        return `<div><strong>${d}</strong><br/>${p.marker} ${name}: ${val}</div>`;
      }
    },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8', formatter: TIME_AXIS_FORMATTER },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1e293b' } }
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { type: 'slider', height: 18, bottom: 5, borderColor: '#334155', textStyle: { color: '#64748b' } }
    ],
    series: [
      {
        name,
        type: 'line',
        smooth: false,
        symbol: 'none',
        connectNulls: false,
        sampling: 'lttb',
        itemStyle: { color },
        lineStyle: { color, width: 2 },
        areaStyle: { color, opacity: 0.1 },
        data,
        markLine: failureMarks.length
          ? {
              symbol: 'none',
              silent: true,
              lineStyle: { type: 'solid', width: 2, opacity: 0.7 },
              data: failureMarks
            }
          : undefined
      }
    ]
  };
}
