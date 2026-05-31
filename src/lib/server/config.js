import fs from 'node:fs';
import path from 'node:path';
import { Cron } from 'croner';
import { CONFIG_PATH, DATA_DIR } from './paths.js';

export const PROVIDERS = ['ookla', 'cloudflare'];
export const TIME_RANGES = ['1h', '6h', '24h', '7d', '30d', '90d'];

const DEFAULT_CONFIG = {
  scheduledTestsEnabled: true,
  cron: '*/10 * * * *',
  activeProvider: 'cloudflare',
  testTimeoutSeconds: 120,
  defaultChartTimeRange: '24h',
  ookla: {
    serverId: '',
    extraArgs: ''
  },
  cloudflare: {
    downloadBytes: 25000000,
    uploadBytes: 10000000,
    downloadEndpoint: '',
    uploadEndpoint: '',
    latencyEndpoint: ''
  }
};

let cached = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function deepMerge(base, override) {
  if (override === null || override === undefined) return base;
  if (typeof base !== 'object' || Array.isArray(base)) return override;
  const out = { ...base };
  for (const k of Object.keys(override)) {
    if (
      out[k] &&
      typeof out[k] === 'object' &&
      !Array.isArray(out[k]) &&
      typeof override[k] === 'object' &&
      !Array.isArray(override[k]) &&
      override[k] !== null
    ) {
      out[k] = deepMerge(out[k], override[k]);
    } else {
      out[k] = override[k];
    }
  }
  return out;
}

export function loadConfig() {
  if (cached) return cached;
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    cached = { ...DEFAULT_CONFIG, ookla: { ...DEFAULT_CONFIG.ookla }, cloudflare: { ...DEFAULT_CONFIG.cloudflare } };
    persist(cached);
    return cached;
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    cached = deepMerge(
      { ...DEFAULT_CONFIG, ookla: { ...DEFAULT_CONFIG.ookla }, cloudflare: { ...DEFAULT_CONFIG.cloudflare } },
      parsed
    );
    return cached;
  } catch (e) {
    console.error('Failed to parse config, using defaults:', e.message);
    cached = { ...DEFAULT_CONFIG, ookla: { ...DEFAULT_CONFIG.ookla }, cloudflare: { ...DEFAULT_CONFIG.cloudflare } };
    return cached;
  }
}

export function getDefaultConfig() {
  return { ...DEFAULT_CONFIG, ookla: { ...DEFAULT_CONFIG.ookla }, cloudflare: { ...DEFAULT_CONFIG.cloudflare } };
}

export function validateConfig(cfg) {
  const errors = [];
  if (!cfg || typeof cfg !== 'object') {
    return { valid: false, errors: ['Config must be an object'] };
  }
  if (typeof cfg.scheduledTestsEnabled !== 'boolean') {
    errors.push('scheduledTestsEnabled must be a boolean');
  }
  if (typeof cfg.cron !== 'string' || !cfg.cron.trim()) {
    errors.push('cron must be a non-empty string');
  } else {
    try {
      new Cron(cfg.cron, { paused: true });
    } catch (e) {
      errors.push(`cron is not a valid cron expression: ${e.message}`);
    }
  }
  if (!PROVIDERS.includes(cfg.activeProvider)) {
    errors.push(`activeProvider must be one of: ${PROVIDERS.join(', ')}`);
  }
  if (
    typeof cfg.testTimeoutSeconds !== 'number' ||
    !Number.isFinite(cfg.testTimeoutSeconds) ||
    cfg.testTimeoutSeconds < 5 ||
    cfg.testTimeoutSeconds > 600
  ) {
    errors.push('testTimeoutSeconds must be a number between 5 and 600');
  }
  if (!TIME_RANGES.includes(cfg.defaultChartTimeRange)) {
    errors.push(`defaultChartTimeRange must be one of: ${TIME_RANGES.join(', ')}`);
  }
  if (!cfg.ookla || typeof cfg.ookla !== 'object') {
    errors.push('ookla settings must be an object');
  } else {
    if (cfg.ookla.serverId != null && typeof cfg.ookla.serverId !== 'string') {
      errors.push('ookla.serverId must be a string');
    }
    if (cfg.ookla.extraArgs != null && typeof cfg.ookla.extraArgs !== 'string') {
      errors.push('ookla.extraArgs must be a string');
    }
  }
  if (!cfg.cloudflare || typeof cfg.cloudflare !== 'object') {
    errors.push('cloudflare settings must be an object');
  } else {
    if (
      typeof cfg.cloudflare.downloadBytes !== 'number' ||
      cfg.cloudflare.downloadBytes < 1000 ||
      cfg.cloudflare.downloadBytes > 1_000_000_000
    ) {
      errors.push('cloudflare.downloadBytes must be a number between 1000 and 1,000,000,000');
    }
    if (
      typeof cfg.cloudflare.uploadBytes !== 'number' ||
      cfg.cloudflare.uploadBytes < 1000 ||
      cfg.cloudflare.uploadBytes > 1_000_000_000
    ) {
      errors.push('cloudflare.uploadBytes must be a number between 1000 and 1,000,000,000');
    }
    for (const k of ['downloadEndpoint', 'uploadEndpoint', 'latencyEndpoint']) {
      if (cfg.cloudflare[k] != null && typeof cfg.cloudflare[k] !== 'string') {
        errors.push(`cloudflare.${k} must be a string`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function persist(cfg) {
  ensureDataDir();
  const tmp = path.join(path.dirname(CONFIG_PATH), `.config.json.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_PATH);
}

export function saveConfig(newConfig) {
  const { valid, errors } = validateConfig(newConfig);
  if (!valid) {
    const err = new Error('Invalid configuration');
    err.code = 'invalid_config';
    err.details = errors;
    throw err;
  }
  persist(newConfig);
  cached = newConfig;
  return cached;
}

export function reloadConfig() {
  cached = null;
  return loadConfig();
}
