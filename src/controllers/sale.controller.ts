import type { NextFunction, Request, Response } from 'express';

import { createSale } from '../services/sale.service';
import { AppError } from '../types/api';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';

export async function postSale(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const userId = Number(authenticatedRequest.user?.sub);
    if (!Number.isInteger(userId) || userId <= 0) throw new AppError(401, 'INVALID_TOKEN', 'Token utilisateur invalide.');
    response.status(201).json({ success: true, data: await createSale(request.body, userId) });
  } catch (error) {
    next(error);
  }
}