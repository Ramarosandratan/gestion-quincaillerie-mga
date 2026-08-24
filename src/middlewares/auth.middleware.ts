import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config/env';

export interface AuthenticatedRequest extends Request {
  user?: jwt.JwtPayload;
}

export function authenticateToken(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  if (!config.jwtSecret) {
    response.status(500).json({ error: 'JWT_SECRET is not configured' });
    return;
  }

  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : undefined;

  if (!token) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    request.user = typeof payload === 'string' ? { sub: payload } : payload;
    next();
  } catch {
    response.status(401).json({ error: 'Invalid token' });
  }
}