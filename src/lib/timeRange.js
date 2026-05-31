export const TIME_RANGE_OPTIONS = [
  { value: '1h', label: 'Last hour', ms: 60 * 60 * 1000 },
  { value: '6h', label: 'Last 6 hours', ms: 6 * 60 * 60 * 1000 },
  { value: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'Last 30 days', ms: 30 * 24 * 60 * 60 * 1000 },
  { value: '90d', label: 'Last 90 days', ms: 90 * 24 * 60 * 60 * 1000 }
];

export function timeRangeToFromMs(range) {
  const opt = TIME_RANGE_OPTIONS.find((o) => o.value === range);
  if (!opt) return Date.now() - 24 * 60 * 60 * 1000;
  return Date.now() - opt.ms;
}

export function formatLocalDateTime(epochMs) {
  if (epochMs == null) return '—';
  const d = new Date(epochMs);
  return d.toLocaleString();
}

export function formatRelative(epochMs) {
  if (epochMs == null) return '—';
  const diff = Date.now() - epochMs;
  const abs = Math.abs(diff);
  const sec = Math.round(abs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function formatNumber(n, digits = 2) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
