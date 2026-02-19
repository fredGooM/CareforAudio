import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'ADMIN' | 'USER';
  };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = (req as any).headers['authorization'];
  // Ensure authHeader is a string (it can be string[] in generic IncomingHttpHeaders)
  const token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined;

  if (!token) return (res as any).sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return (res as any).sendStatus(403);
    (req as AuthRequest).user = user;
    next();
  });
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if ((req as AuthRequest).user?.role !== 'ADMIN') {
    return (res as any).status(403).json({ error: 'Admin access required' });
  }
  next();
};