import { json } from '@sveltejs/kit';
import { getRuns, getLatestRun, getLatestSuccessfulRun, getSummary, getLastFailureTime } from '$lib/server/runs.js';
import { timeRangeToFromMs } from '$lib/timeRange.js';
import { loadConfig } from '$lib/server/config.js';

export async function GET({ url }) {
  const config = loadConfig();
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');

  let from, to;
  if (fromParam && toParam) {
    from = Number(fromParam);
    to = Number(toParam);
  } else {
    const range = url.searchParams.get('range') || config.defaultChartTimeRange;
    to = Date.now();
    from = timeRangeToFromMs(range);
  }

  const runs = getRuns({ from, to });
  const latest = getLatestRun();
  const latestSuccess = getLatestSuccessfulRun();
  const summary = getSummary({ from, to });
  const lastFailureAt = getLastFailureTime();

  return json({ runs, latest, latestSuccess, summary, lastFailureAt });
}
