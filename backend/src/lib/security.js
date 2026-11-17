import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
// OWASP: opcion de scrypt con ~32 MiB y 3 pasos paralelos.
const PARAMS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}
export function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128 && Buffer.byteLength(password, 'utf8') <= 256;
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, Buffer.from(salt, 'hex'), KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  try {
    const [kind, n, r, p, salt, hex] = stored.split('$');
    if (kind !== 'scrypt' || +n !== PARAMS.N || +r !== PARAMS.r || +p !== PARAMS.p || !/^[a-f\d]{32}$/i.test(salt) || !/^[a-f\d]{128}$/i.test(hex)) return false;
    const proposed = await scrypt(password, Buffer.from(salt, 'hex'), KEY_LENGTH, PARAMS);
    return timingSafeEqual(proposed, Buffer.from(hex, 'hex'));
  } catch {
    return false;
  }
}
export function makeToken() { return randomBytes(32).toString('base64url'); }
export function tokenHash(raw) { return createHash('sha256').update(raw).digest('hex'); }

export const COOKIE_NAME = 'nexo_sesion';
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export function sessionCookie(token) {
  const isProduction = process.env.NODE_ENV === 'production';
  return `${COOKIE_NAME}=${token}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}${isProduction ? '; Secure' : ''}`;
}
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export function readCookie(header = '', name = COOKIE_NAME) {
  const part = header.split(';').map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : null;
}
