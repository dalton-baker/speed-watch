import { runProvider } from './providers/index.js';
import { insertRun } from './runs.js';
import { loadConfig } from './config.js';

let activeRun = null;

export function isRunActive() {
  return activeRun !== null;
}

export function getActiveRun() {
  return activeRun;
}

export async function executeRun({ trigger, scheduledAt = null }) {
  const config = loadConfig();
  const provider = config.activeProvider;

  if (activeRun) {
    const startedAt = Date.now();
    const finishedAt = startedAt;
    const skipped = {
      provider,
      status: 'skipped',
      trigger,
      scheduledAt,
      startedAt,
      finishedAt,
      errorCode: 'previous_run_still_active',
      errorMessage: 'A previous test was still active when this run was triggered.'
    };
    if (trigger === 'scheduled') {
      const id = insertRun(skipped);
      return { ...skipped, id, persisted: true };
    }
    return { ...skipped, persisted: false };
  }

  const startedAt = Date.now();
  activeRun = { provider, trigger, scheduledAt, startedAt };

  let result;
  try {
    result = await runProvider(provider, { config });
  } catch (e) {
    result = {
      status: 'failed',
      errorCode: 'unknown_error',
      errorMessage: e?.message || 'Unknown error during provider run'
    };
  } finally {
    activeRun = null;
  }

  const finishedAt = Date.now();
  const record = {
    provider,
    trigger,
    scheduledAt,
    startedAt,
    finishedAt,
    ...result
  };

  if (trigger === 'scheduled') {
    const id = insertRun(record);
    return { ...record, id, persisted: true };
  }

  return { ...record, persisted: false };
}
