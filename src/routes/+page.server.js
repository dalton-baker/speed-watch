import { loadConfig } from '$lib/server/config.js';

export async function load({ url }) {
  const config = loadConfig();
  const range = url.searchParams.get('range') || config.defaultChartTimeRange;
  return { config, range };
}
