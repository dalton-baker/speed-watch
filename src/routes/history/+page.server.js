import { getRunsPaginated } from '$lib/server/runs.js';

export async function load({ url }) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const provider = url.searchParams.get('provider') || '';
  const status = url.searchParams.get('status') || 'all';
  const result = getRunsPaginated({ page, limit: 50, provider: provider || undefined, status });
  return { ...result, provider, status };
}
