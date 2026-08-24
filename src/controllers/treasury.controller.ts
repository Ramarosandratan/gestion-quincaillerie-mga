import type { NextFunction, Request, Response } from 'express';

import { closeCashRegister, createExpense, createSettlement } from '../services/treasury.service';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../types/api';

function userId(request: Request): number {
  const id = Number((request as AuthenticatedRequest).user?.sub);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(401, 'INVALID_TOKEN', 'Token utilisateur invalide.');
  return id;
}

export async function postExpense(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { response.status(201).json({ success: true, data: await createExpense(request.body, userId(request)) }); } catch (error) { next(error); }
}

export async function postSettlement(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { response.status(201).json({ success: true, data: await createSettlement(request.params.id, request.body, userId(request)) }); } catch (error) { next(error); }
}

export async function postClosure(request: Request, response: Response, next: NextFunction): Promise<void> {
  try { response.status(201).json({ success: true, data: await closeCashRegister(userId(request), request.body) }); } catch (error) { next(error); }
}