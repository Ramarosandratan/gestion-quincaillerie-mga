import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config/env';
import type { AuthTokenPayload, UserRole } from '../types/auth';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function authMiddleware(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const authorization = request.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : undefined;

  if (!token) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!config.jwtSecret) {
    response.status(500).json({ error: 'JWT_SECRET is not configured' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === 'string' || !isAuthTokenPayload(payload)) {
      response.status(401).json({ error: 'Invalid token' });
      return;
    }

    request.user = payload;
    next();
  } catch {
    response.status(401).json({ error: 'Invalid token' });
  }
}

function isAuthTokenPayload(payload: jwt.JwtPayload): payload is AuthTokenPayload {
  return (
    typeof payload.sub === 'string' &&
    (payload.role === 'ADMIN' || payload.role === 'CAISSIER')
  );
}

export const authenticateToken = authMiddleware;