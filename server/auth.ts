import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error('[FATAL] SESSION_SECRET environment variable is not set. Refusing to start with an insecure default JWT secret.');
}
const COOKIE_NAME = 'obs_admin_token';

export interface AuthenticatedRequest extends Request {
  admin?: {
    id: string;
    username: string;
    email: string;
  };
}

export function generateAdminToken(adminId: string, username: string): string {
  return jwt.sign({ id: adminId, username }, JWT_SECRET, { expiresIn: '7d' });
}

export function setAdminAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearAdminAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { 
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
}

export function verifyAdminSession(req: Request) {
  try {
    // Check Authorization header or Cookie
    let token: string | undefined = undefined;
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
    

    const admin = db.getAdminById(decoded.id);
    if (!admin) return null;

    return { id: admin.id, username: admin.username, email: admin.email };
  } catch (err) {
    return null;
  }
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const session = verifyAdminSession(req);
  if (!session) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Admin authentication required to access this resource.',
    });
  }
  req.admin = session;
  next();
}
