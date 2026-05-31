import { json } from '@sveltejs/kit';
import { executeRun, isRunActive } from '$lib/server/runManager.js';

export async function POST() {
  if (isRunActive()) {
    return json(
      {
        error: 'previous_run_still_active',
        message: 'A speed test is already running.'
      },
      { status: 409 }
    );
  }
  const result = await executeRun({ trigger: 'manual' });
  return json({ run: result });
}
