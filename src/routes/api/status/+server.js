import { json } from '@sveltejs/kit';
import { getSchedulerStatus } from '$lib/server/scheduler.js';
import { isRunActive } from '$lib/server/runManager.js';
import { getSummary, getLastFailureTime } from '$lib/server/runs.js';

export async function GET({ url }) {
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const from = fromParam ? Number(fromParam) : undefined;
  const to = toParam ? Number(toParam) : undefined;

  const summary = getSummary({ from, to });
  return json({
    scheduler: getSchedulerStatus(),
    runActive: isRunActive(),
    summary,
    lastFailureAt: getLastFailureTime()
  });
}
