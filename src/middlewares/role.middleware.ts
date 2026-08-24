import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from './auth.middleware';

export function requireRole(...roles: string[]) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    const role = request.user?.role;

    if (!role || !roles.includes(String(role))) {
      response.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}