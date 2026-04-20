import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { requireAuth } from '../middleware/auth';
import { occupiedSeats } from './events';

const router = Router();

const createSchema = z.object({
  event_id: z.number().int().positive(),
  seats: z.number().int().positive().default(1),
});

router.post('/', requireAuth, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION' });

  const { event_id, seats } = parsed.data;
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(event_id) as any;
  if (!event) return res.status(404).json({ error: 'EVENT_NOT_FOUND' });
  if (event.status !== 'active') return res.status(409).json({ error: 'EVENT_CANCELLED' });
  if (new Date(event.start_at) < new Date()) return res.status(409).json({ error: 'EVENT_PAST' });

  const existing = db.prepare(
    `SELECT id FROM reservations WHERE event_id = ? AND user_id = ? AND status = 'confirmed'`
  ).get(event_id, req.user!.id);
  if (existing) return res.status(409).json({ error: 'ALREADY_RESERVED' });

  const taken = occupiedSeats(event_id);
  if (taken + seats > event.capacity) {
    return res.status(409).json({ error: 'NO_SEATS_AVAILABLE', available: event.capacity - taken });
  }

  const result = db.prepare(
    `INSERT INTO reservations (event_id, user_id, seats) VALUES (?,?,?)`
  ).run(event_id, req.user!.id, seats);

  const created = db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.get('/mine', requireAuth, (req, res) => {
  const rows = db.prepare(
    `SELECT r.*, e.title, e.start_at, e.location
     FROM reservations r JOIN events e ON e.id = r.event_id
     WHERE r.user_id = ? ORDER BY e.start_at ASC`
  ).all(req.user!.id);
  res.json(rows);
});

router.delete('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id) as any;
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  if (row.user_id !== req.user!.id) return res.status(403).json({ error: 'FORBIDDEN' });

  db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`).run(id);
  res.json({ ok: true });
});

export default router;
