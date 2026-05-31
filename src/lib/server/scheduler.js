import { Cron } from 'croner';
import { loadConfig } from './config.js';
import { executeRun, isRunActive } from './runManager.js';
import { insertRun } from './runs.js';

let job = null;
let currentCron = null;
let currentEnabled = null;

async function tick(scheduledAt) {
  const config = loadConfig();
  if (!config.scheduledTestsEnabled) {
    const now = Date.now();
    insertRun({
      provider: config.activeProvider,
      status: 'skipped',
      trigger: 'scheduled',
      scheduledAt,
      startedAt: now,
      finishedAt: now,
      errorCode: 'provider_disabled',
      errorMessage: 'Scheduled tests are disabled in config.'
    });
    return;
  }
  if (isRunActive()) {
    const now = Date.now();
    insertRun({
      provider: config.activeProvider,
      status: 'skipped',
      trigger: 'scheduled',
      scheduledAt,
      startedAt: now,
      finishedAt: now,
      errorCode: 'previous_run_still_active',
      errorMessage: 'A previous scheduled test was still running when this tick fired.'
    });
    return;
  }
  try {
    await executeRun({ trigger: 'scheduled', scheduledAt });
  } catch (e) {
    console.error('Scheduled run failed unexpectedly:', e);
  }
}

export function startScheduler() {
  const config = loadConfig();
  currentCron = config.cron;
  currentEnabled = config.scheduledTestsEnabled;
  stopScheduler();
  try {
    job = new Cron(config.cron, { paused: !config.scheduledTestsEnabled }, () => tick(Date.now()));
    console.log(`Scheduler started with cron: ${config.cron} (enabled=${config.scheduledTestsEnabled})`);
  } catch (e) {
    console.error('Failed to start scheduler:', e.message);
    job = null;
  }
}

export function stopScheduler() {
  if (job) {
    try { job.stop(); } catch {}
    job = null;
  }
}

export function reloadScheduler() {
  const config = loadConfig();
  if (config.cron !== currentCron || config.scheduledTestsEnabled !== currentEnabled) {
    startScheduler();
  }
}

export function getSchedulerStatus() {
  const config = loadConfig();
  return {
    running: !!job,
    cron: currentCron,
    enabled: currentEnabled,
    nextRun: job?.nextRun()?.getTime() ?? null,
    activeProvider: config.activeProvider
  };
}
