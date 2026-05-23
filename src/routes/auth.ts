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

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION', issues: parsed.error.issues });

  const { email, password, full_name, role } = parsed.data;
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email],
  });
  if (existing.rows.length > 0) return res.status(409).json({ error: 'EMAIL_EXISTS' });

  const hash = bcrypt.hashSync(password, 10);
  const result = await db.execute({
    sql: 'INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?,?)',
    args: [email, hash, full_name, role],
  });

  const user = { id: Number(result.lastInsertRowid), email, role };
  const token = signToken(user);
  return res.status(201).json({ token, user: { ...user, full_name } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'VALIDATION' });

  const { email, password } = parsed.data;
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  });
  const row = result.rows[0] as any;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
  }

  const user = { id: Number(row.id), email: row.email as string, role: row.role as 'user' | 'organizer' };
  const token = signToken(user);
  return res.json({ token, user: { ...user, full_name: row.full_name } });
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT id, email, full_name, role, created_at FROM users WHERE id = ?',
    args: [req.user!.id],
  });
  return res.json(result.rows[0] ?? null);
});

export default router;
