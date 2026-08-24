export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}