import { createClient, type Client } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

function buildClient(): Client {
  if (TURSO_URL) {
    return createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  }
  // Локален SQLite файл (за разработка без интернет)
  const localPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  return createClient({ url: `file:${localPath}` });
}

export const db = buildClient();

export async function initSchema() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user','organizer')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        start_at DATETIME NOT NULL,
        capacity INTEGER NOT NULL CHECK (capacity > 0),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0),
        status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at)`,
      `CREATE INDEX IF NOT EXISTS idx_reservations_event ON reservations(event_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id)`,
    ],
    'write'
  );

  await migrateReservationsUniqueIndex();
}

// The original reservations table had `UNIQUE(event_id, user_id, status)`, which
// blocked a user from cancelling a re-reservation (two 'cancelled' rows for the
// same (event, user) pair collided). Rebuild the table without that constraint and
// enforce uniqueness only on currently-confirmed rows via a partial unique index.
async function migrateReservationsUniqueIndex() {
  const tableRes = await db.execute(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='reservations'`
  );
  const sqlDef = (tableRes.rows[0] as any)?.sql as string | undefined;
  const hasOldConstraint =
    !!sqlDef && /UNIQUE\s*\(\s*event_id\s*,\s*user_id\s*,\s*status\s*\)/i.test(sqlDef);

  if (hasOldConstraint) {
    await db.batch(
      [
        `CREATE TABLE reservations_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0),
          status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `INSERT INTO reservations_new (id, event_id, user_id, seats, status, created_at)
           SELECT id, event_id, user_id, seats, status, created_at FROM reservations`,
        `DROP TABLE reservations`,
        `ALTER TABLE reservations_new RENAME TO reservations`,
        `CREATE INDEX idx_reservations_event ON reservations(event_id)`,
        `CREATE INDEX idx_reservations_user ON reservations(user_id)`,
      ],
      'write'
    );
  }

  await db.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_confirmed_unique
       ON reservations(event_id, user_id) WHERE status='confirmed'`
  );
}
