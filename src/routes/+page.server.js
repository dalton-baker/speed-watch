import { loadConfig } from '$lib/server/config.js';
import { getRuns, getLatestRun, getLatestSuccessfulRun, getSummary, getLastFailureTime } from '$lib/server/runs.js';
import { timeRangeToFromMs } from '$lib/timeRange.js';

export async function load({ url }) {
  const config = loadConfig();
  const range = url.searchParams.get('range') || config.defaultChartTimeRange;
  const from = timeRangeToFromMs(range);
  const to = Date.now();
  const runs = getRuns({ from, to });
  const latest = getLatestRun();
  const latestSuccess = getLatestSuccessfulRun();
  const summary = getSummary({ from, to });
  const lastFailureAt = getLastFailureTime();
  return {
    config,
    range,
    from,
    to,
    runs,
    latest,
    latestSuccess,
    summary,
    lastFailureAt
  };
}
