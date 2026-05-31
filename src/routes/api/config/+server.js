import { json } from '@sveltejs/kit';
import { loadConfig, saveConfig, validateConfig } from '$lib/server/config.js';
import { reloadScheduler } from '$lib/server/scheduler.js';

export async function GET() {
  return json({ config: loadConfig() });
}

export async function PUT({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_json' }, { status: 400 });
  }
  const candidate = body?.config ?? body;
  const { valid, errors } = validateConfig(candidate);
  if (!valid) {
    return json({ error: 'invalid_config', details: errors }, { status: 400 });
  }
  try {
    const saved = saveConfig(candidate);
    reloadScheduler();
    return json({ config: saved });
  } catch (e) {
    if (e.code === 'invalid_config') {
      return json({ error: 'invalid_config', details: e.details }, { status: 400 });
    }
    return json({ error: 'unknown_error', message: e.message }, { status: 500 });
  }
}
