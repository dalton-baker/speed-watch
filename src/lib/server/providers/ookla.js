import { spawn } from 'node:child_process';

export const OOKLA_PROVIDER_NAME = 'ookla';

function buildArgs(settings) {
  const args = ['--format=json', '--accept-license', '--accept-gdpr'];
  if (settings.serverId && String(settings.serverId).trim()) {
    args.push('--server-id', String(settings.serverId).trim());
  }
  if (settings.extraArgs && settings.extraArgs.trim()) {
    const extras = settings.extraArgs.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    for (const e of extras) {
      args.push(e.replace(/^"|"$/g, ''));
    }
  }
  return args;
}

function runCli(args, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn('speedtest', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ ok: false, errorCode: 'ookla_cli_missing', errorMessage: e.message });
      return;
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      const code = err.code === 'ENOENT' ? 'ookla_cli_missing' : 'ookla_cli_failed';
      resolve({ ok: false, errorCode: code, errorMessage: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({ ok: false, errorCode: 'timeout', errorMessage: `Ookla CLI timed out after ${timeoutMs}ms`, stdout, stderr });
        return;
      }
      if (code !== 0) {
        resolve({
          ok: false,
          errorCode: 'ookla_cli_failed',
          errorMessage: stderr.trim() || `Ookla CLI exited with code ${code}`,
          stdout,
          stderr,
          exitCode: code
        });
        return;
      }
      resolve({ ok: true, stdout, stderr });
    });
  });
}

function parseResult(stdout) {
  let json;
  try {
    json = JSON.parse(stdout);
  } catch (e) {
    return { ok: false, errorCode: 'ookla_invalid_output', errorMessage: `Failed to parse Ookla JSON: ${e.message}` };
  }
  const downloadMbps = json.download?.bandwidth != null ? (json.download.bandwidth * 8) / 1_000_000 : null;
  const uploadMbps = json.upload?.bandwidth != null ? (json.upload.bandwidth * 8) / 1_000_000 : null;
  return {
    ok: true,
    data: {
      downloadMbps,
      uploadMbps,
      pingMs: json.ping?.latency ?? null,
      jitterMs: json.ping?.jitter ?? null,
      packetLossPct: json.packetLoss ?? null,

      idleLatencyMs: json.ping?.latency ?? null,
      idleJitterMs: json.ping?.jitter ?? null,
      idleLowMs: json.ping?.low ?? null,
      idleHighMs: json.ping?.high ?? null,

      downloadLatencyMs: json.download?.latency?.iqm ?? null,
      downloadJitterMs: json.download?.latency?.jitter ?? null,
      downloadLatencyLowMs: json.download?.latency?.low ?? null,
      downloadLatencyHighMs: json.download?.latency?.high ?? null,

      uploadLatencyMs: json.upload?.latency?.iqm ?? null,
      uploadJitterMs: json.upload?.latency?.jitter ?? null,
      uploadLatencyLowMs: json.upload?.latency?.low ?? null,
      uploadLatencyHighMs: json.upload?.latency?.high ?? null,

      isp: json.isp ?? null,
      externalIp: json.interface?.externalIp ?? null,
      serverId: json.server?.id != null ? String(json.server.id) : null,
      serverName: json.server?.name ?? null,
      serverLocation: json.server?.location ?? null,
      serverHost: json.server?.host ?? null,
      rawDetails: json
    }
  };
}

export async function runOokla({ settings, timeoutSeconds }) {
  const timeoutMs = Math.max(5, timeoutSeconds || 120) * 1000;
  const args = buildArgs(settings || {});
  const cli = await runCli(args, timeoutMs);
  if (!cli.ok) {
    return {
      status: cli.errorCode === 'timeout' ? 'timeout' : 'failed',
      errorCode: cli.errorCode,
      errorMessage: cli.errorMessage,
      rawDetails: { stdout: cli.stdout, stderr: cli.stderr, exitCode: cli.exitCode }
    };
  }
  const parsed = parseResult(cli.stdout);
  if (!parsed.ok) {
    return {
      status: 'failed',
      errorCode: parsed.errorCode,
      errorMessage: parsed.errorMessage,
      rawDetails: { stdout: cli.stdout, stderr: cli.stderr }
    };
  }
  return {
    status: 'success',
    ...parsed.data
  };
}
