import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { requireAuth, requireOrganizer } from '../middleware/auth';

const router = Router();

// Помощна функция за броене на заети места
function occupiedSeats(eventId: number): number {
  const row = db.prepare(
    `SELECT COALESCE(SUM(seats),0) AS taken FROM reservations
     WHERE event_id = ? AND status = 'confirmed'`
  ).get(eventId) as { taken: number };
  return row.taken;
}

// GET /api/events - всички активни бъдещи събития
router.get('/', requireAuth, (_req, res) => {
  const rows = db.prepare(
    `SELECT e.*, u.full_name AS organizer_name
     FROM events e JOIN users u ON u.id = e.organizer_id
     WHERE e.status = 'active' AND datetime(e.start_at) >= datetime('now')
     ORDER BY e.start_at ASC`
  ).all() as any[];

  const withAvailability = rows.map(e => ({
    ...e,
    available_seats: e.capacity - occupiedSeats(e.id),
  }));
  res.json(withAvailability);
});

// GET /api/events/mine - събития на организатора
router.get('/mine', requireAuth, requireOrganizer, (req, res) => {
  const rows = db.prepare(
    `SELECT e.*,
       (SELECT COUNT(*) FROM reservations r WHERE r.event_id = e.id AND r.status = 'confirmed') AS reservations_count
     FROM events e WHERE e.organizer_id = ?
     ORDER BY e.start_at DESC`
  ).all(req.user!.id);
  res.json(rows);
});

// GET /api/events/:id
router.get('/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const event = db.prepare(
    `SELECT e.*, u.full_name AS organizer_name
     FROM events e JOIN users u ON u.id = e.organizer_id WHERE e.id = ?`
  ).get(id) as any;
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  event.available_seats = event.capacity - occupiedSeats(id);
  res.json(event);
});

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  location: z.string().optional(),
  start_at: z.string().datetime(),
  capacity: z.number().int().positive(),
});

router.post('/', requireAuth, requireOrganizer, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION', issues: parsed.error.issues });

  const { title, description, location, start_at, capacity } = parsed.data;
  if (new Date(start_at) < new Date()) {
    return res.status(400).json({ error: 'START_IN_PAST' });
  }

  const result = db.prepare(
    `INSERT INTO events (organizer_id, title, description, location, start_at, capacity)
     VALUES (?,?,?,?,?,?)`
  ).run(req.user!.id, title, description || null, location || null, start_at, capacity);

  const created = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id', requireAuth, requireOrganizer, (req, res) => {
  const id = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  if (event.organizer_id !== req.user!.id) return res.status(403).json({ error: 'FORBIDDEN' });

  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION' });

  const fields = parsed.data;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.json(event);

  const setClause = keys.map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE events SET ${setClause} WHERE id = ?`).run(...keys.map(k => (fields as any)[k]), id);
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(id));
});

router.delete('/:id', requireAuth, requireOrganizer, (req, res) => {
  const id = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  if (event.organizer_id !== req.user!.id) return res.status(403).json({ error: 'FORBIDDEN' });

  const tx = db.transaction(() => {
    db.prepare(`UPDATE events SET status = 'cancelled' WHERE id = ?`).run(id);
    db.prepare(`UPDATE reservations SET status = 'cancelled' WHERE event_id = ?`).run(id);
  });
  tx();
  res.json({ ok: true });
});

// GET /api/events/:id/reservations - списък на резервиралите (само за организатора)
router.get('/:id/reservations', requireAuth, requireOrganizer, (req, res) => {
  const id = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  if (event.organizer_id !== req.user!.id) return res.status(403).json({ error: 'FORBIDDEN' });

  const rows = db.prepare(
    `SELECT r.id, r.seats, r.status, r.created_at, u.full_name, u.email
     FROM reservations r JOIN users u ON u.id = r.user_id
     WHERE r.event_id = ? ORDER BY r.created_at DESC`
  ).all(id);
  res.json(rows);
});

export default router;
export { occupiedSeats };
