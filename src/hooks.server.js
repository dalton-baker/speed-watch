import { loadConfig } from '$lib/server/config.js';
import { getDb } from '$lib/server/db.js';
import { startScheduler } from '$lib/server/scheduler.js';

let initialized = false;

function init() {
  if (initialized) return;
  initialized = true;
  try {
    getDb();
    loadConfig();
    startScheduler();
  } catch (e) {
    console.error('Failed to initialize server:', e);
  }
}

init();

export async function handle({ event, resolve }) {
  return resolve(event);
}
