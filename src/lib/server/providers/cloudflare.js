import { performance } from 'node:perf_hooks';

export const CLOUDFLARE_PROVIDER_NAME = 'cloudflare';

const DEFAULT_DOWNLOAD_ENDPOINT = 'https://speed.cloudflare.com/__down?bytes=';
const DEFAULT_UPLOAD_ENDPOINT = 'https://speed.cloudflare.com/__up';
const DEFAULT_LATENCY_ENDPOINT = 'https://speed.cloudflare.com/__down?bytes=0';
const META_ENDPOINT = 'https://speed.cloudflare.com/meta';

function abortableFetch(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function measureLatency(endpoint, timeoutMs, samples = 6) {
  const times = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    try {
      const res = await abortableFetch(endpoint, { method: 'GET', cache: 'no-store' }, timeoutMs);
      await res.arrayBuffer();
      times.push(performance.now() - start);
    } catch (e) {
      // skip failed sample
    }
  }
  if (times.length === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const variance = times.reduce((a, b) => a + (b - mean) ** 2, 0) / times.length;
  const stddev = Math.sqrt(variance);
  return {
    median,
    low: sorted[0],
    high: sorted[sorted.length - 1],
    jitter: stddev,
    samples: times
  };
}

async function measureDownload(endpointBase, bytes, timeoutMs) {
  const url = endpointBase + bytes;
  const start = performance.now();
  const res = await abortableFetch(url, { method: 'GET', cache: 'no-store' }, timeoutMs);
  if (!res.ok) {
    throw new Error(`Download HTTP ${res.status}`);
  }
  let received = 0;
  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) received += value.byteLength;
  }
  const elapsedMs = performance.now() - start;
  const mbps = (received * 8) / 1_000_000 / (elapsedMs / 1000);
  return { mbps, bytes: received, elapsedMs };
}

async function measureUpload(endpoint, bytes, timeoutMs) {
  const payload = new Uint8Array(bytes);
  const start = performance.now();
  const res = await abortableFetch(
    endpoint,
    {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/octet-stream' },
      duplex: 'half'
    },
    timeoutMs
  );
  if (!res.ok) {
    throw new Error(`Upload HTTP ${res.status}`);
  }
  await res.arrayBuffer();
  const elapsedMs = performance.now() - start;
  const mbps = (bytes * 8) / 1_000_000 / (elapsedMs / 1000);
  return { mbps, bytes, elapsedMs };
}

async function fetchMeta(timeoutMs) {
  try {
    const res = await abortableFetch(META_ENDPOINT, { method: 'GET', cache: 'no-store' }, timeoutMs);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function runCloudflare({ settings, timeoutSeconds }) {
  const timeoutMs = Math.max(5, timeoutSeconds || 120) * 1000;
  const startTime = Date.now();
  const remaining = () => Math.max(1000, timeoutMs - (Date.now() - startTime));

  const downloadEndpoint = (settings?.downloadEndpoint || '').trim() || DEFAULT_DOWNLOAD_ENDPOINT;
  const uploadEndpoint = (settings?.uploadEndpoint || '').trim() || DEFAULT_UPLOAD_ENDPOINT;
  const latencyEndpoint = (settings?.latencyEndpoint || '').trim() || DEFAULT_LATENCY_ENDPOINT;
  const downloadBytes = settings?.downloadBytes || 25_000_000;
  const uploadBytes = settings?.uploadBytes || 10_000_000;

  const raw = { endpoints: { downloadEndpoint, uploadEndpoint, latencyEndpoint }, requestedBytes: { downloadBytes, uploadBytes } };

  let meta = null;
  try {
    meta = await fetchMeta(Math.min(5000, remaining()));
    raw.meta = meta;
  } catch {}

  let latency = null;
  let latencyError = null;
  try {
    latency = await measureLatency(latencyEndpoint, Math.min(5000, remaining()), 6);
    raw.latency = latency;
  } catch (e) {
    latencyError = e.message;
  }

  let download = null;
  let downloadError = null;
  try {
    download = await measureDownload(downloadEndpoint, downloadBytes, remaining());
    raw.download = download;
  } catch (e) {
    downloadError = e.message;
  }

  let upload = null;
  let uploadError = null;
  try {
    upload = await measureUpload(uploadEndpoint, uploadBytes, remaining());
    raw.upload = upload;
  } catch (e) {
    uploadError = e.message;
  }

  const errors = [];
  if (downloadError) errors.push(`download: ${downloadError}`);
  if (uploadError) errors.push(`upload: ${uploadError}`);

  const timedOut = (Date.now() - startTime) >= timeoutMs;

  let status = 'success';
  let errorCode = null;
  let errorMessage = null;

  if (downloadError && uploadError) {
    if (timedOut) {
      status = 'timeout';
      errorCode = 'timeout';
      errorMessage = `Cloudflare test timed out after ${timeoutMs}ms`;
    } else {
      status = 'failed';
      errorCode = 'cloudflare_request_failed';
      errorMessage = errors.join('; ');
    }
  } else if (downloadError) {
    status = 'partial';
    errorCode = 'cloudflare_download_failed';
    errorMessage = downloadError;
  } else if (uploadError) {
    status = 'partial';
    errorCode = 'cloudflare_upload_failed';
    errorMessage = uploadError;
  }

  return {
    status,
    errorCode,
    errorMessage,
    downloadMbps: download?.mbps ?? null,
    uploadMbps: upload?.mbps ?? null,
    pingMs: latency?.median ?? null,
    jitterMs: latency?.jitter ?? null,
    packetLossPct: null,

    idleLatencyMs: latency?.median ?? null,
    idleJitterMs: latency?.jitter ?? null,
    idleLowMs: latency?.low ?? null,
    idleHighMs: latency?.high ?? null,

    isp: meta?.asOrganization ?? null,
    externalIp: meta?.clientIp ?? null,
    serverId: meta?.colo ?? null,
    serverName: meta?.colo ?? null,
    serverLocation: meta?.city && meta?.country ? `${meta.city}, ${meta.country}` : (meta?.city ?? meta?.country ?? null),
    serverHost: (() => {
      try { return new URL(downloadEndpoint).host; } catch { return null; }
    })(),
    message: latencyError ? `latency: ${latencyError}` : null,
    rawDetails: raw
  };
}
