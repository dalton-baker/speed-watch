import { json } from '@sveltejs/kit';
import { getLatestRun } from '$lib/server/runs.js';

export async function GET() {
  const run = getLatestRun();
  return json({ run });
}
