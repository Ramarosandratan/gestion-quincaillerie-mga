import type { NextFunction, Request, Response } from 'express';

import { createClient, listClients } from '../services/client.service';

export async function postClient(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.status(201).json({ success: true, data: await createClient(request.body) });
  } catch (error) {
    next(error);
  }
}

export async function getClients(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ success: true, data: await listClients() });
  } catch (error) {
    next(error);
  }
}
