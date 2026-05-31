import { loadConfig } from '$lib/server/config.js';

export async function load() {
  return { config: loadConfig() };
}
