import jwt from 'jsonwebtoken';
import type { TokenPayload } from '../types/auth';

const JWT_SECRET_RAW = process.env['JWT_SECRET'];
if (!JWT_SECRET_RAW) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = JWT_SECRET_RAW;
const ACCESS_TOKEN_EXPIRY = '2h';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: Pick<TokenPayload, 'userId'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as TokenPayload;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as unknown as TokenPayload;
  } catch {
    return null;
  }
}
