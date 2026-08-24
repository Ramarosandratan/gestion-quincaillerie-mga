import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';

import { AppError } from '../types/api';

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

  if (error instanceof AppError) {
    response.status(error.statusCode).json({ success: false, error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Invalid JSON body' },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const details =
      prismaErrorMap[error.code] ??
      { status: 500, message: 'Database request failed', appError: 'DATABASE_ERROR' };

    response.status(details.status).json({
      success: false,
      error: { code: details.appError, message: details.message },
    });
    return;
  }

  response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  });
};