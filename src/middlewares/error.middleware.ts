import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status = error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : 500;
    response.status(status).json({ error: 'Database request failed', code: error.code });
    return;
  }

  response.status(500).json({ error: 'Internal server error' });
};