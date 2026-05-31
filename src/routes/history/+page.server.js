import { loadConfig } from '$lib/server/config.js';
import { getRuns } from '$lib/server/runs.js';
import { timeRangeToFromMs } from '$lib/timeRange.js';

export async function load({ url }) {
  const config = loadConfig();
  const range = url.searchParams.get('range') || config.defaultChartTimeRange;
  const provider = url.searchParams.get('provider') || '';
  const from = timeRangeToFromMs(range);
  const to = Date.now();
  const runs = getRuns({ from, to, provider: provider || undefined });
  return { config, range, provider, runs };
}
