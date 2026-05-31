import { json } from '@sveltejs/kit';
import { getLatestSuccessfulRun } from '$lib/server/runs.js';

export async function GET() {
  const run = getLatestSuccessfulRun();
  return json({ run });
}
