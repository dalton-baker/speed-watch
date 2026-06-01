import { getDb } from './db.js';

const COLUMNS = [
  'provider', 'status', 'trigger',
  'scheduled_at', 'started_at', 'finished_at',
  'download_mbps', 'upload_mbps', 'ping_ms', 'jitter_ms', 'packet_loss_pct',
  'idle_latency_ms', 'idle_jitter_ms', 'idle_low_ms', 'idle_high_ms',
  'download_latency_ms', 'download_jitter_ms', 'download_latency_low_ms', 'download_latency_high_ms',
  'upload_latency_ms', 'upload_jitter_ms', 'upload_latency_low_ms', 'upload_latency_high_ms',
  'isp', 'external_ip', 'server_id', 'server_name', 'server_location', 'server_host',
  'message', 'error_code', 'error_message', 'raw_details'
];

function rowToRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    trigger: row.trigger,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    downloadMbps: row.download_mbps,
    uploadMbps: row.upload_mbps,
    pingMs: row.ping_ms,
    jitterMs: row.jitter_ms,
    packetLossPct: row.packet_loss_pct,
    idleLatencyMs: row.idle_latency_ms,
    idleJitterMs: row.idle_jitter_ms,
    idleLowMs: row.idle_low_ms,
    idleHighMs: row.idle_high_ms,
    downloadLatencyMs: row.download_latency_ms,
    downloadJitterMs: row.download_jitter_ms,
    downloadLatencyLowMs: row.download_latency_low_ms,
    downloadLatencyHighMs: row.download_latency_high_ms,
    uploadLatencyMs: row.upload_latency_ms,
    uploadJitterMs: row.upload_jitter_ms,
    uploadLatencyLowMs: row.upload_latency_low_ms,
    uploadLatencyHighMs: row.upload_latency_high_ms,
    isp: row.isp,
    externalIp: row.external_ip,
    serverId: row.server_id,
    serverName: row.server_name,
    serverLocation: row.server_location,
    serverHost: row.server_host,
    message: row.message,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    rawDetails: row.raw_details ? safeParse(row.raw_details) : null
  };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return s; }
}

export function insertRun(run) {
  const db = getDb();
  const values = COLUMNS.map((col) => {
    const camel = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    let v = run[camel];
    if (v === undefined) v = null;
    if (col === 'raw_details' && v && typeof v !== 'string') {
      v = JSON.stringify(v);
    }
    return v;
  });
  const placeholders = COLUMNS.map(() => '?').join(',');
  const stmt = db.prepare(`INSERT INTO runs (${COLUMNS.join(',')}) VALUES (${placeholders})`);
  const info = stmt.run(...values);
  return info.lastInsertRowid;
}

export function getRunById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM runs WHERE id = ?').get(id);
  return rowToRun(row);
}

export function getLatestRun() {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM runs WHERE trigger = 'scheduled' ORDER BY started_at DESC, id DESC LIMIT 1`)
    .get();
  return rowToRun(row);
}

export function getLatestSuccessfulRun() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM runs WHERE trigger = 'scheduled' AND status = 'success' ORDER BY started_at DESC, id DESC LIMIT 1`
    )
    .get();
  return rowToRun(row);
}

export function getRuns({ from, to, provider, limit } = {}) {
  const db = getDb();
  const where = [`trigger = 'scheduled'`];
  const params = [];
  if (from != null) {
    where.push('started_at >= ?');
    params.push(from);
  }
  if (to != null) {
    where.push('started_at <= ?');
    params.push(to);
  }
  if (provider) {
    where.push('provider = ?');
    params.push(provider);
  }
  let sql = `SELECT * FROM runs WHERE ${where.join(' AND ')} ORDER BY started_at ASC, id ASC`;
  if (limit != null) {
    sql += ' LIMIT ?';
    params.push(limit);
  }
  const rows = db.prepare(sql).all(...params);
  return rows.map(rowToRun);
}

export function getRunsPaginated({ page = 1, limit = 50, provider, status } = {}) {
  const db = getDb();
  const where = [`trigger = 'scheduled'`];
  const params = [];
  if (provider) {
    where.push('provider = ?');
    params.push(provider);
  }
  if (status && status !== 'all') {
    if (status === 'failed') {
      where.push("status IN ('failed', 'error')");
    } else {
      where.push('status = ?');
      params.push(status);
    }
  }
  const whereClause = where.join(' AND ');
  const countSql = `SELECT COUNT(*) as total FROM runs WHERE ${whereClause}`;
  const total = db.prepare(countSql).get(...params).total;
  const offset = (page - 1) * limit;
  const dataSql = `SELECT * FROM runs WHERE ${whereClause} ORDER BY started_at DESC, id DESC LIMIT ? OFFSET ?`;
  const rows = db.prepare(dataSql).all(...params, limit, offset);
  return { runs: rows.map(rowToRun), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function getSummary({ from, to } = {}) {
  const db = getDb();
  const where = [`trigger = 'scheduled'`];
  const params = [];
  if (from != null) {
    where.push('started_at >= ?');
    params.push(from);
  }
  if (to != null) {
    where.push('started_at <= ?');
    params.push(to);
  }
  const sql = `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failures,
      SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeouts,
      SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partials,
      SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
    FROM runs WHERE ${where.join(' AND ')}
  `;
  return db.prepare(sql).get(...params);
}

export function getLastFailureTime() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT started_at FROM runs WHERE trigger = 'scheduled' AND status != 'success' ORDER BY started_at DESC LIMIT 1`
    )
    .get();
  return row ? row.started_at : null;
}
