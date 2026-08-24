import type { NextFunction, Request, Response } from 'express';

import { InvalidCredentialsError, login } from '../services/auth.service';
import type { LoginBody } from '../types/auth';

export async function loginController(
  request: Request<unknown, unknown, LoginBody>,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const { email, password } = request.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    response.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const token = await login(email.trim().toLowerCase(), password);
    response.json({ token });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      response.status(401).json({ error: error.message });
      return;
    }

    next(error);
  }
}