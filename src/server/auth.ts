// Cuentas de usuario: registro, inicio y cierre de sesión, cambio de
// contraseña y eliminación de la cuenta. Cada consultorio pertenece a una
// cuenta y ninguna consulta de datos puede hacerse sin una sesión válida.

import { getDb } from "@/server/db";
import {
  dummyPasswordCheck,
  hashPassword,
  newId,
  newToken,
  sha256,
  verifyPassword,
} from "@/server/crypto";
import { HttpError, cookieHeader, readCookie } from "@/server/http";

export const SESSION_COOKIE = "consultorio_sesion";
const SESSION_DAYS = 30;
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 8;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  specialty: string | null;
}

interface UserRow extends PublicUser {
  password_hash: string;
  failed_logins: number;
  locked_until: Date | string | null;
}

function toPublic(row: PublicUser): PublicUser {
  return { id: row.id, email: row.email, name: row.name, specialty: row.specialty ?? null };
}

export function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

function validateEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpError(400, "Escribe un correo válido.", "invalid_email");
  }
}

export function validatePassword(password: unknown): string {
  const value = String(password ?? "");
  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`, "weak_password");
  }
  if (value.length > 200) throw new HttpError(400, "La contraseña es demasiado larga.", "weak_password");
  return value;
}

async function createSession(userId: string): Promise<string> {
  const db = await getDb();
  const token = newToken();
  await db.query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3::text || ' days')::interval)`,
    [sha256(token), userId, String(SESSION_DAYS)]
  );
  return token;
}

export function sessionCookie(request: Request, token: string): string {
  return cookieHeader(request, SESSION_COOKIE, token, SESSION_DAYS * 24 * 60 * 60);
}

export function clearSessionCookie(request: Request): string {
  return cookieHeader(request, SESSION_COOKIE, "", 0);
}

export async function register(input: {
  name: unknown;
  email: unknown;
  password: unknown;
  specialty?: unknown;
  acceptPrivacy: unknown;
}): Promise<{ user: PublicUser; token: string }> {
  const name = String(input.name ?? "").trim();
  const email = normalizeEmail(input.email);
  const specialty = String(input.specialty ?? "").trim() || null;
  if (!name) throw new HttpError(400, "Escribe tu nombre.", "invalid_name");
  if (name.length > 120) throw new HttpError(400, "El nombre es demasiado largo.", "invalid_name");
  validateEmail(email);
  const password = validatePassword(input.password);
  if (input.acceptPrivacy !== true) {
    throw new HttpError(400, "Para crear tu cuenta debes aceptar el aviso de privacidad.", "privacy_required");
  }

  const db = await getDb();
  const existing = await db.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
  if (existing.length > 0) {
    throw new HttpError(409, "Ya existe una cuenta con ese correo. Inicia sesión.", "email_taken");
  }
  const id = newId("usr");
  await db.query(
    `INSERT INTO users (id, email, name, specialty, password_hash, privacy_accepted_at)
     VALUES ($1, $2, $3, $4, $5, now())`,
    [id, email, name, specialty, await hashPassword(password)]
  );
  const token = await createSession(id);
  return { user: { id, email, name, specialty }, token };
}

export async function login(input: { email: unknown; password: unknown }): Promise<{ user: PublicUser; token: string }> {
  const email = normalizeEmail(input.email);
  const password = String(input.password ?? "");
  const invalid = new HttpError(401, "Correo o contraseña incorrectos.", "invalid_credentials");
  const db = await getDb();
  const [row] = await db.query<UserRow>(
    `SELECT id, email, name, specialty, password_hash, failed_logins, locked_until FROM users WHERE email = $1`,
    [email]
  );
  if (!row) {
    await dummyPasswordCheck(password);
    throw invalid;
  }
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    throw new HttpError(
      429,
      `Demasiados intentos fallidos. Espera ${LOCK_MINUTES} minutos e inténtalo de nuevo.`,
      "locked"
    );
  }
  if (!(await verifyPassword(password, row.password_hash))) {
    const failed = row.failed_logins + 1;
    await db.query(
      `UPDATE users SET failed_logins = $2::int,
         locked_until = CASE WHEN $2::int >= $3::int THEN now() + ($4::text || ' minutes')::interval ELSE NULL END
       WHERE id = $1`,
      [row.id, failed, MAX_FAILED_LOGINS, String(LOCK_MINUTES)]
    );
    throw invalid;
  }
  await db.query(`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1`, [row.id]);
  await db.query(`DELETE FROM auth_sessions WHERE user_id = $1 AND expires_at < now()`, [row.id]);
  return { user: toPublic(row), token: await createSession(row.id) };
}

export async function getSessionUser(request: Request): Promise<PublicUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const db = await getDb();
  const [row] = await db.query<PublicUser>(
    `SELECT u.id, u.email, u.name, u.specialty FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
  return row ? toPublic(row) : null;
}

export async function requireUser(request: Request): Promise<PublicUser> {
  const user = await getSessionUser(request);
  if (!user) throw new HttpError(401, "Tu sesión terminó. Vuelve a iniciar sesión.", "unauthenticated");
  return user;
}

export async function logout(request: Request): Promise<void> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return;
  const db = await getDb();
  await db.query(`DELETE FROM auth_sessions WHERE token_hash = $1`, [sha256(token)]);
}

async function checkPassword(userId: string, password: unknown) {
  const db = await getDb();
  const [row] = await db.query<{ password_hash: string }>(`SELECT password_hash FROM users WHERE id = $1`, [userId]);
  if (!row || !(await verifyPassword(String(password ?? ""), row.password_hash))) {
    throw new HttpError(403, "La contraseña actual no es correcta.", "wrong_password");
  }
}

/** Cambia la contraseña y cierra las demás sesiones abiertas (otros dispositivos). */
export async function changePassword(request: Request, user: PublicUser, current: unknown, next: unknown) {
  await checkPassword(user.id, current);
  const password = validatePassword(next);
  const db = await getDb();
  await db.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [user.id, await hashPassword(password)]);
  const token = readCookie(request, SESSION_COOKIE);
  await db.query(`DELETE FROM auth_sessions WHERE user_id = $1 AND token_hash <> $2`, [user.id, sha256(token ?? "")]);
}

export async function updateProfile(user: PublicUser, input: { name: unknown; specialty?: unknown }) {
  const name = String(input.name ?? "").trim();
  if (!name) throw new HttpError(400, "Escribe tu nombre.", "invalid_name");
  const specialty = String(input.specialty ?? "").trim() || null;
  const db = await getDb();
  await db.query(`UPDATE users SET name = $2, specialty = $3 WHERE id = $1`, [user.id, name.slice(0, 120), specialty]);
  return { ...user, name: name.slice(0, 120), specialty };
}

/** Borra la cuenta y, en cascada, sus sesiones y todos los datos del consultorio. */
export async function deleteAccount(user: PublicUser, password: unknown) {
  await checkPassword(user.id, password);
  const db = await getDb();
  await db.query(`DELETE FROM users WHERE id = $1`, [user.id]);
}
