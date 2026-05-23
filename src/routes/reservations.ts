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

router.post('/', requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION' });

  const { event_id, seats } = parsed.data;
  const eventRes = await db.execute({
    sql: 'SELECT * FROM events WHERE id = ?',
    args: [event_id],
  });
  const event = eventRes.rows[0] as any;
  if (!event) return res.status(404).json({ error: 'EVENT_NOT_FOUND' });
  if (event.status !== 'active') return res.status(409).json({ error: 'EVENT_CANCELLED' });
  if (new Date(event.start_at) < new Date()) return res.status(409).json({ error: 'EVENT_PAST' });

  const existing = await db.execute({
    sql: `SELECT id FROM reservations WHERE event_id = ? AND user_id = ? AND status = 'confirmed'`,
    args: [event_id, req.user!.id],
  });
  if (existing.rows.length > 0) return res.status(409).json({ error: 'ALREADY_RESERVED' });

  const taken = await occupiedSeats(event_id);
  const capacity = Number(event.capacity);
  if (taken + seats > capacity) {
    return res.status(409).json({ error: 'NO_SEATS_AVAILABLE', available: capacity - taken });
  }

  const result = await db.execute({
    sql: `INSERT INTO reservations (event_id, user_id, seats) VALUES (?,?,?)`,
    args: [event_id, req.user!.id, seats],
  });

  const created = await db.execute({
    sql: 'SELECT * FROM reservations WHERE id = ?',
    args: [Number(result.lastInsertRowid)],
  });
  res.status(201).json(created.rows[0]);
});

router.get('/mine', requireAuth, async (req, res) => {
  const r = await db.execute({
    sql: `SELECT r.*, e.title, e.start_at, e.location
          FROM reservations r JOIN events e ON e.id = r.event_id
          WHERE r.user_id = ? ORDER BY e.start_at ASC`,
    args: [req.user!.id],
  });
  res.json(r.rows);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.execute({
    sql: 'SELECT * FROM reservations WHERE id = ?',
    args: [id],
  });
  const row = existing.rows[0] as any;
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  if (Number(row.user_id) !== req.user!.id) return res.status(403).json({ error: 'FORBIDDEN' });

  await db.execute({
    sql: `UPDATE reservations SET status = 'cancelled' WHERE id = ?`,
    args: [id],
  });
  res.json({ ok: true });
});

export default router;
