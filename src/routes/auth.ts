import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db/database';
import { requireAuth, signToken } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(2),
  role: z.enum(['user', 'organizer']).default('user'),
});

router.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION', issues: parsed.error.issues });

  const { email, password, full_name, role } = parsed.data;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'EMAIL_EXISTS' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?,?)'
  ).run(email, hash, full_name, role);

  const user = { id: result.lastInsertRowid as number, email, role };
  const token = signToken(user);
  return res.status(201).json({ token, user: { ...user, full_name } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION' });

  const { email, password } = parsed.data;
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const user = { id: row.id as number, email: row.email, role: row.role };
  const token = signToken(user);
  return res.json({ token, user: { ...user, full_name: row.full_name } });
});

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?').get(req.user!.id);
  return res.json(row);
});

export default router;
