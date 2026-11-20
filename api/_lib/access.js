import { createClient } from '@supabase/supabase-js';
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function database() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError(503, 'Server database configuration is missing.');
  return createClient(url, key, { auth: { persistSession: false } });
}
export function check(error) {
  if (!error) return;
  if (error.code === '23505') throw new HttpError(409, 'This ID, LRN, or email is already registered.');
  if (['42P01', 'PGRST205', 'PGRST202'].includes(error.code)) {
    throw new HttpError(503, 'Account registration setup is required. Please contact the administrator.');
  }
  throw new HttpError(400, error.message);
}
export function postOnly(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed.');
  const origin = req.headers?.origin;
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  if (origin && new URL(origin).host !== host) throw new HttpError(403, 'Invalid request origin.');
}
export function respondError(res, err) {
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Unable to complete the request. Please try again.' });
}
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, hash) {
  if (typeof password !== 'string' || !hash) return false;
  const [salt, digest] = hash.split(':');
  if (!salt || !digest) return false;
  const expected = Buffer.from(digest, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
function signature(value) {
  const key = process.env.APP_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new HttpError(503, 'Session configuration is missing.');
  return createHmac('sha256', key).update(value).digest('base64url');
}
export function signSession(id, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ id, exp: now + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function readSessionToken(token, now = Date.now()) {
  try {
    const [payload, sig, extra] = token.split('.');
    if (!payload || !sig || extra) return null;
    const actual = Buffer.from(sig);
    const expected = Buffer.from(signature(payload));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.id && session.exp > now ? session : null;
  } catch { return null; }
}
export function sessionCookie(req, value, maxAge = 28800) {
  const secure = req.headers?.['x-forwarded-proto'] === 'https' || process.env.VERCEL ? '; Secure' : '';
  return `sf10_access=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}
export async function requireAccount(req, db, roles = ['admin', 'teacher', 'student']) {
  const cookie = (req.headers?.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('sf10_access='));
  const session = readSessionToken(cookie?.slice('sf10_access='.length) || '');
  if (!session) throw new HttpError(401, 'Please sign in again.');
  const { data, error } = await db.from('app_accounts').select('*').eq('id', session.id).single();
  check(error);
  if (!data || data.status !== 'approved') throw new HttpError(403, 'Your account is not approved for access.');
  if (!roles.includes(data.role)) throw new HttpError(403, 'You do not have permission for this action.');
  return data;
}
export function publicSession(account) {
  return { id: account.linked_id || account.id, accountId: account.id, role: account.role, name: account.name, email: account.email };
}

const text = (value, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export function validateRegistration(body) {
  const role = body.role;
  if (!['teacher', 'student'].includes(role)) throw new HttpError(400, 'Choose Teacher or Student.');
  const password = body.password;
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new HttpError(400, 'Use a password with 8–128 characters.');
  const firstName = text(body.firstName), lastName = text(body.lastName);
  if (!firstName || !lastName) throw new HttpError(400, 'First name and last name are required.');
  const email = text(body.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid contact email.');
  const identifier = text(role === 'teacher' ? body.teacherId : body.lrn, 50);
  if (role === 'teacher' && (!/^[a-zA-Z0-9-]{3,50}$/.test(identifier) || identifier.toUpperCase() === 'T-ADMIN')) throw new HttpError(400, 'Enter your valid teacher ID.');
  if (role === 'student' && !/^\d{12}$/.test(identifier)) throw new HttpError(400, 'LRN must contain exactly 12 digits.');
  const details = { firstName, lastName, middleName: text(body.middleName), classId: text(body.classId, 80), verification: text(body.verification, 1500) };
  if (!details.verification) throw new HttpError(400, 'Provide details the school can use to verify your registration.');
  if (role === 'teacher') details.position = text(body.position) || 'Teacher';
  else {
    details.sex = body.sex;
    details.birthdate = text(body.birthdate, 10);
    const parsedDate = new Date(details.birthdate);
    if (!['Male', 'Female'].includes(details.sex) || !/^\d{4}-\d{2}-\d{2}$/.test(details.birthdate) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== details.birthdate || details.birthdate > new Date().toISOString().slice(0, 10)) throw new HttpError(400, 'Enter a valid birthdate and sex.');
  }
  if (!details.classId) throw new HttpError(400, 'Choose a class section.');
  return { role, identifier: identifier.toLowerCase(), email, name: [firstName, details.middleName, lastName].filter(Boolean).join(' '), details, password_hash: hashPassword(password), status: 'pending' };
}
