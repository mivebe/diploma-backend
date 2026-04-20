import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

// Уверяваме се, че папката съществува
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user','organizer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organizer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_at DATETIME NOT NULL,
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seats INTEGER NOT NULL DEFAULT 1 CHECK (seats > 0),
      status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, user_id, status)
    );

    CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at);
    CREATE INDEX IF NOT EXISTS idx_reservations_event ON reservations(event_id);
    CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
  `);
}
