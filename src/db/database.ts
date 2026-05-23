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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id, status)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at)`,
      `CREATE INDEX IF NOT EXISTS idx_reservations_event ON reservations(event_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id)`,
    ],
    'write'
  );
}
