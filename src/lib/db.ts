import { Platform } from 'react-native';

import type { GeoPoint, PauseInterval } from '@/features/walk/geo';
import { logger } from './logger';

export interface ActiveWalkRecord {
  id: string;
  state: 'active' | 'paused';
  startedAt: number; // epoch ms
  pauseIntervals: PauseInterval[];
}

export interface WalkUploadPayload {
  client_id: string;
  started_at: string;
  ended_at: string;
  duration_s: number;
  moving_time_s: number;
  distance_m: number;
  avg_speed_mps: number;
  route_polyline: string;
  point_count: number;
  steps?: number | null;
  active_kcal?: number | null;
  kcal_source?: 'health' | 'estimate' | null;
}

export interface PendingWalkUploadRow {
  walk_id: string;
  payload: WalkUploadPayload;
  attempts: number;
  last_error: string | null;
  created_at: number;
}

// In-memory fallback for Jest / Web environments
let memActiveWalk: ActiveWalkRecord | null = null;
const memWalkPoints = new Map<string, GeoPoint[]>();
const memPendingUploads = new Map<string, PendingWalkUploadRow>();

interface SQLiteSyncDb {
  execSync(source: string): void;
  runSync(source: string, ...params: (string | number | null)[]): unknown;
  getFirstSync<T>(source: string, ...params: (string | number | null)[]): T | null;
  getAllSync<T>(source: string, ...params: (string | number | null)[]): T[];
}

let sqliteDb: SQLiteSyncDb | null = null;

function getDb(): SQLiteSyncDb | null {
  if (Platform.OS === 'web' || process.env.NODE_ENV === 'test') {
    return null;
  }

  if (sqliteDb) {
    return sqliteDb;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require('expo-sqlite') as {
      openDatabaseSync: (name: string) => SQLiteSyncDb;
    };
    const db = SQLite.openDatabaseSync('walkingcat_walks.db');
    db.execSync(`
      CREATE TABLE IF NOT EXISTS active_walk (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        id TEXT NOT NULL,
        state TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        paused_intervals TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS walk_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        walk_id TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        accuracy REAL,
        speed REAL,
        timestamp INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_walk_points_walk_id ON walk_points (walk_id, timestamp ASC);
      CREATE TABLE IF NOT EXISTS pending_uploads (
        walk_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL
      );
    `);
    sqliteDb = db;
    return db;
  } catch (err) {
    logger.warn('Failed to open local SQLite DB, falling back to memory', {
      error: String(err),
    });
    return null;
  }
}

export function saveActiveWalkRecord(record: ActiveWalkRecord): void {
  const db = getDb();
  if (!db) {
    memActiveWalk = { ...record, pauseIntervals: [...record.pauseIntervals] };
    return;
  }

  db.runSync(
    `INSERT OR REPLACE INTO active_walk (singleton, id, state, started_at, paused_intervals)
     VALUES (1, ?, ?, ?, ?)`,
    record.id,
    record.state,
    record.startedAt,
    JSON.stringify(record.pauseIntervals)
  );
}

export function getActiveWalkRecord(): ActiveWalkRecord | null {
  const db = getDb();
  if (!db) {
    return memActiveWalk
      ? { ...memActiveWalk, pauseIntervals: [...memActiveWalk.pauseIntervals] }
      : null;
  }

  const row = db.getFirstSync<{
    id: string;
    state: 'active' | 'paused';
    started_at: number;
    paused_intervals: string;
  }>('SELECT id, state, started_at, paused_intervals FROM active_walk WHERE singleton = 1');

  if (!row) {
    return null;
  }

  let pauseIntervals: PauseInterval[] = [];
  try {
    pauseIntervals = JSON.parse(row.paused_intervals) as PauseInterval[];
  } catch {
    pauseIntervals = [];
  }

  return {
    id: row.id,
    state: row.state,
    startedAt: row.started_at,
    pauseIntervals,
  };
}

export function clearActiveWalkData(walkId?: string): void {
  const db = getDb();
  if (!db) {
    const idToClear = walkId ?? memActiveWalk?.id;
    memActiveWalk = null;
    if (idToClear) {
      memWalkPoints.delete(idToClear);
    }
    return;
  }

  const active = getActiveWalkRecord();
  const targetId = walkId ?? active?.id;
  db.runSync('DELETE FROM active_walk WHERE singleton = 1');
  if (targetId) {
    db.runSync('DELETE FROM walk_points WHERE walk_id = ?', targetId);
  }
}

export function insertWalkPoints(walkId: string, points: readonly GeoPoint[]): void {
  if (points.length === 0) return;

  const db = getDb();
  if (!db) {
    const existing = memWalkPoints.get(walkId) ?? [];
    memWalkPoints.set(walkId, [...existing, ...points]);
    return;
  }

  for (const pt of points) {
    db.runSync(
      `INSERT INTO walk_points (walk_id, lat, lng, accuracy, speed, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      walkId,
      pt.latitude,
      pt.longitude,
      pt.accuracy ?? null,
      pt.speed ?? null,
      pt.timestamp
    );
  }
}

export function getWalkPoints(walkId: string): GeoPoint[] {
  const db = getDb();
  if (!db) {
    return [...(memWalkPoints.get(walkId) ?? [])];
  }

  const rows = db.getAllSync<{
    lat: number;
    lng: number;
    accuracy: number | null;
    speed: number | null;
    timestamp: number;
  }>(
    'SELECT lat, lng, accuracy, speed, timestamp FROM walk_points WHERE walk_id = ? ORDER BY timestamp ASC',
    walkId
  );

  return rows.map((r) => ({
    latitude: r.lat,
    longitude: r.lng,
    accuracy: r.accuracy,
    speed: r.speed,
    timestamp: r.timestamp,
  }));
}

export function enqueueWalkUpload(walkId: string, payload: WalkUploadPayload): void {
  const now = Date.now();
  const db = getDb();
  if (!db) {
    memPendingUploads.set(walkId, {
      walk_id: walkId,
      payload,
      attempts: 0,
      last_error: null,
      created_at: now,
    });
    return;
  }

  db.runSync(
    `INSERT OR REPLACE INTO pending_uploads (walk_id, payload, attempts, last_error, created_at)
     VALUES (?, ?, 0, NULL, ?)`,
    walkId,
    JSON.stringify(payload),
    now
  );
}

export function listPendingWalkUploads(): PendingWalkUploadRow[] {
  const db = getDb();
  if (!db) {
    return Array.from(memPendingUploads.values()).sort(
      (a, b) => a.created_at - b.created_at
    );
  }

  const rows = db.getAllSync<{
    walk_id: string;
    payload: string;
    attempts: number;
    last_error: string | null;
    created_at: number;
  }>(
    'SELECT walk_id, payload, attempts, last_error, created_at FROM pending_uploads ORDER BY created_at ASC'
  );

  const parsed: PendingWalkUploadRow[] = [];
  for (const row of rows) {
    try {
      parsed.push({
        walk_id: row.walk_id,
        payload: JSON.parse(row.payload) as WalkUploadPayload,
        attempts: row.attempts,
        last_error: row.last_error,
        created_at: row.created_at,
      });
    } catch {
      // Ignore malformed row
    }
  }
  return parsed;
}

export function markPendingUploadError(walkId: string, errorMessage: string): void {
  const db = getDb();
  if (!db) {
    const existing = memPendingUploads.get(walkId);
    if (existing) {
      memPendingUploads.set(walkId, {
        ...existing,
        attempts: existing.attempts + 1,
        last_error: errorMessage,
      });
    }
    return;
  }

  db.runSync(
    'UPDATE pending_uploads SET attempts = attempts + 1, last_error = ? WHERE walk_id = ?',
    errorMessage,
    walkId
  );
}

export function removePendingWalkUpload(walkId: string): void {
  const db = getDb();
  if (!db) {
    memPendingUploads.delete(walkId);
    return;
  }

  db.runSync('DELETE FROM pending_uploads WHERE walk_id = ?', walkId);
}
