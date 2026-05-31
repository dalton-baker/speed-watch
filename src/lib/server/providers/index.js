import { runOokla, OOKLA_PROVIDER_NAME } from './ookla.js';
import { runCloudflare, CLOUDFLARE_PROVIDER_NAME } from './cloudflare.js';

export const PROVIDER_NAMES = [OOKLA_PROVIDER_NAME, CLOUDFLARE_PROVIDER_NAME];

export async function runProvider(name, { config }) {
  const timeoutSeconds = config.testTimeoutSeconds;
  if (name === OOKLA_PROVIDER_NAME) {
    return runOokla({ settings: config.ookla, timeoutSeconds });
  }
  if (name === CLOUDFLARE_PROVIDER_NAME) {
    return runCloudflare({ settings: config.cloudflare, timeoutSeconds });
  }
  return {
    status: 'failed',
    errorCode: 'unknown_error',
    errorMessage: `Unknown provider: ${name}`
  };
}
