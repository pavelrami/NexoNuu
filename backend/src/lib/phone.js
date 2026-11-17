import { randomInt } from 'node:crypto';

/** Este incremento acepta exclusivamente telefonos moviles mexicanos (+52 y 10 digitos). */
export function normalizeMxPhone(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\s()\-.]/g, '');
  if (/^[0-9]{10}$/.test(cleaned)) return `+52${cleaned}`;
  if (/^\+52[0-9]{10}$/.test(cleaned)) return cleaned;
  return null;
}
export function maskedPhone(phone) {
  return phone ? `+52 ******${phone.slice(-4)}` : null;
}
export function makeOtp() { return String(randomInt(0, 1_000_000)).padStart(6, '0'); }
