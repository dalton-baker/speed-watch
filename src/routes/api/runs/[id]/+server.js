import { json, error } from '@sveltejs/kit';
import { getRunById } from '$lib/server/runs.js';

export async function GET({ params }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    throw error(400, 'invalid id');
  }
  const run = getRunById(id);
  if (!run) {
    throw error(404, 'not found');
  }
  return json({ run });
}
