import { json } from '@sveltejs/kit';
import { getRuns } from '$lib/server/runs.js';
import { PROVIDER_NAMES } from '$lib/server/providers/index.js';

export async function GET({ url }) {
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const provider = url.searchParams.get('provider');
  const limitParam = url.searchParams.get('limit');

  const from = fromParam ? Number(fromParam) : undefined;
  const to = toParam ? Number(toParam) : undefined;
  const limit = limitParam ? Number(limitParam) : undefined;

  if (fromParam && !Number.isFinite(from)) {
    return json({ error: 'invalid_from' }, { status: 400 });
  }
  if (toParam && !Number.isFinite(to)) {
    return json({ error: 'invalid_to' }, { status: 400 });
  }
  if (provider && !PROVIDER_NAMES.includes(provider)) {
    return json({ error: 'invalid_provider' }, { status: 400 });
  }

  const runs = getRuns({ from, to, provider, limit });
  return json({ runs });
}
