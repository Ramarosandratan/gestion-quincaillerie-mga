import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';

interface PrismaErrorDetail {
  status: number;
  message: string;
  appError: string;
}

const prismaErrorMap: Record<string, PrismaErrorDetail> = {
  P2025: { status: 404, message: 'Resource not found', appError: 'NOT_FOUND' },
  P2002: { status: 409, message: 'Unique constraint violation', appError: 'UNIQUE_CONFLICT' },
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const details =
      prismaErrorMap[error.code] ??
      { status: 500, message: 'Database request failed', appError: 'DATABASE_ERROR' };

    response
      .status(details.status)
      .json({ error: details.message, appError: details.appError, code: error.code });
    return;
  }

  response.status(500).json({ error: 'Internal server error' });
};