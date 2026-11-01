import jwt from 'jsonwebtoken';
import { JWT_SECRET, SITE_PASSWORD } from './env';

export function isValidSession(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

type AuthResult = { success: true; token: string } | { success: false };

export function login(password: string): AuthResult {
  if (password !== SITE_PASSWORD) return { success: false };
  const token = jwt.sign({}, JWT_SECRET, { expiresIn: '30d' });
  return { success: true, token };
}
