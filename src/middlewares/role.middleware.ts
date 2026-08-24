import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from './auth.middleware';
import type { UserRole } from '../types/auth';

export function roleMiddleware(roles: UserRole[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    const role = request.user?.role;

    if (!role || !roles.includes(role)) {
      response.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Accès refusé : droits insuffisants.' },
      });
      return;
    }

    next();
  };
}

export const requireRole = (...roles: UserRole[]) => roleMiddleware(roles);