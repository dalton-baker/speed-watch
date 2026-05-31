import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { DB_PATH, DATA_DIR } from './paths.js';

let db = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrate(conn) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      trigger TEXT NOT NULL,
      scheduled_at INTEGER,
      started_at INTEGER,
      finished_at INTEGER,

      download_mbps REAL,
      upload_mbps REAL,
      ping_ms REAL,
      jitter_ms REAL,
      packet_loss_pct REAL,

      idle_latency_ms REAL,
      idle_jitter_ms REAL,
      idle_low_ms REAL,
      idle_high_ms REAL,

      download_latency_ms REAL,
      download_jitter_ms REAL,
      download_latency_low_ms REAL,
      download_latency_high_ms REAL,

      upload_latency_ms REAL,
      upload_jitter_ms REAL,
      upload_latency_low_ms REAL,
      upload_latency_high_ms REAL,

      isp TEXT,
      external_ip TEXT,
      server_id TEXT,
      server_name TEXT,
      server_location TEXT,
      server_host TEXT,

      message TEXT,
      error_code TEXT,
      error_message TEXT,
      raw_details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
    CREATE INDEX IF NOT EXISTS idx_runs_provider ON runs(provider);
  `);
}

export function getDb() {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
