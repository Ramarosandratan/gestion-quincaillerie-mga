import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { config } from '../config/env';
import { prisma } from '../config/prisma';
import type { AuthTokenPayload } from '../types/auth';

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export async function login(email: string, password: string): Promise<string> {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const user = await prisma.utilisateur.findUnique({ where: { email } });
  const passwordMatches = user
    ? await bcrypt.compare(password, user.motDePasseHash)
    : false;

  if (!user || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const payload: AuthTokenPayload = {
    sub: String(user.id),
    role: user.role,
  };

  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtSecret, options);
}