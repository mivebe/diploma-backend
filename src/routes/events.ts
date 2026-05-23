import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { requireAuth, requireOrganizer } from '../middleware/auth';

const router = Router();

async function occupiedSeats(eventId: number): Promise<number> {
  const r = await db.execute({
    sql: `SELECT COALESCE(SUM(seats),0) AS taken FROM reservations
          WHERE event_id = ? AND status = 'confirmed'`,
    args: [eventId],
  });
  return Number((r.rows[0] as any).taken ?? 0);
}

// GET /api/events
router.get('/', requireAuth, async (_req, res) => {
  const r = await db.execute(
    `SELECT e.*, u.full_name AS organizer_name
     FROM events e JOIN users u ON u.id = e.organizer_id
     WHERE e.status = 'active' AND datetime(e.start_at) >= datetime('now')
     ORDER BY e.start_at ASC`
  );
  const rows = r.rows as any[];
  const withAvailability = await Promise.all(
    rows.map(async (e) => ({
      ...e,
      available_seats: Number(e.capacity) - (await occupiedSeats(Number(e.id))),
    }))
  );
  res.json(withAvailability);
});

// GET /api/events/mine
router.get('/mine', requireAuth, requireOrganizer, async (req, res) => {
  const r = await db.execute({
    sql: `SELECT e.*,
           (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id AND r.status = 'confirmed') AS reservations_count
         FROM events e WHERE e.organizer_id = ?
         ORDER BY e.start_at DESC`,
    args: [req.user!.id],
  });
  res.json(r.rows);
});

// GET /api/events/:id
router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const r = await db.execute({
    sql: `SELECT e.*, u.full_name AS organizer_name
          FROM events e JOIN users u ON u.id = e.organizer_id WHERE e.id = ?`,
    args: [id],
  });
  const event = r.rows[0] as any;
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  event.available_seats = Number(event.capacity) - (await occupiedSeats(id));
  res.json(event);
});

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  location: z.string().optional(),
  start_at: z.string().datetime(),
  capacity: z.number().int().positive(),
});

router.post('/', requireAuth, requireOrganizer, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION', issues: parsed.error.issues });

  const { title, description, location, start_at, capacity } = parsed.data;
  if (new Date(start_at) < new Date()) {
    return res.status(400).json({ error: 'START_IN_PAST' });
  }

  const result = await db.execute({
    sql: `INSERT INTO events (organizer_id, title, description, location, start_at, capacity)
          VALUES (?,?,?,?,?,?)`,
    args: [req.user!.id, title, description || null, location || null, start_at, capacity],
  });

  const created = await db.execute({
    sql: 'SELECT * FROM events WHERE id = ?',
    args: [Number(result.lastInsertRowid)],
  });
  res.status(201).json(created.rows[0]);
});

router.put('/:id', requireAuth, requireOrganizer, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.execute({
    sql: 'SELECT * FROM events WHERE id = ?',
    args: [id],
  });
  const event = existing.rows[0] as any;
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  if (Number(event.organizer_id) !== req.user!.id) return res.status(403).json({ error: 'FORBIDDEN' });

  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION' });

  const fields = parsed.data;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.json(event);

  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  await db.execute({
    sql: `UPDATE events SET ${setClause} WHERE id = ?`,
    args: [...keys.map((k) => (fields as any)[k]), id],
  });
  const updated = await db.execute({
    sql: 'SELECT * FROM events WHERE id = ?',
    args: [id],
  });
  res.json(updated.rows[0]);
});

router.delete('/:id', requireAuth, requireOrganizer, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.execute({
    sql: 'SELECT * FROM events WHERE id = ?',
    args: [id],
  });
  const event = existing.rows[0] as any;
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  if (Number(event.organizer_id) !== req.user!.id) return res.status(403).json({ error: 'FORBIDDEN' });

  await db.batch(
    [
      { sql: `UPDATE events SET status = 'cancelled' WHERE id = ?`, args: [id] },
      { sql: `UPDATE reservations SET status = 'cancelled' WHERE event_id = ?`, args: [id] },
    ],
    'write'
  );
  res.json({ ok: true });
});

// GET /api/events/:id/reservations
router.get('/:id/reservations', requireAuth, requireOrganizer, async (req, res) => {
  const id = Number(req.params.id);
  const existing = await db.execute({
    sql: 'SELECT * FROM events WHERE id = ?',
    args: [id],
  });
  const event = existing.rows[0] as any;
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  if (Number(event.organizer_id) !== req.user!.id) return res.status(403).json({ error: 'FORBIDDEN' });

  const r = await db.execute({
    sql: `SELECT r.id, r.seats, r.status, r.created_at, u.full_name, u.email
          FROM reservations r JOIN users u ON u.id = r.user_id
          WHERE r.event_id = ? ORDER BY r.created_at DESC`,
    args: [id],
  });
  res.json(r.rows);
});

export default router;
export { occupiedSeats };
