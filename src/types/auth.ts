import type { JwtPayload } from 'jsonwebtoken';

export type UserRole = 'ADMIN' | 'CAISSIER';

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
}

export interface LoginBody {
  email?: unknown;
  password?: unknown;
}