import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  email: string;
  role: 'user' | 'organizer';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user: AuthUser): string {
  return jwt.sign(user, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as jwt.SignOptions);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

export function requireOrganizer(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'organizer') {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  next();
}
