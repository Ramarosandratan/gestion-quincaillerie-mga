import type { NextFunction, Request, Response } from 'express';

import { getDashboardStats } from '../services/dashboard.service';

export async function getDashboard(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ success: true, data: await getDashboardStats() });
  } catch (error) {
    next(error);
  }
}
