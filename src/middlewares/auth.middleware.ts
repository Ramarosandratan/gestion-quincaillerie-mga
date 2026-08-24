import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config/env';
import type { AuthTokenPayload } from '../types/auth';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function authMiddleware(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const authorization = request.headers['authorization'];
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : undefined;

  if (!token) {
    response.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Accès refusé : jeton manquant.' },
    });
    return;
  }

  if (!config.jwtSecret) {
    response.status(500).json({
      success: false,
      error: { code: 'AUTH_CONFIGURATION_ERROR', message: 'JWT_SECRET is not configured.' },
    });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === 'string' || !isAuthTokenPayload(payload)) {
      response.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Accès refusé : jeton invalide.' },
      });
      return;
    }

    request.user = payload;
    next();
  } catch {
    response.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Accès refusé : jeton invalide.' },
    });
  }
}

function isAuthTokenPayload(payload: jwt.JwtPayload): payload is AuthTokenPayload {
  return (
    typeof payload.sub === 'string' &&
    (payload.role === 'ADMIN' || payload.role === 'CAISSIER')
  );
}

export const authenticateToken = authMiddleware;