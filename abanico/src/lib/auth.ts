import "server-only";
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, num, str } from "@/lib/db";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = "abanico_equipo";
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 días

export type Role = "owner" | "staff";

export type Staff = {
  id: number;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Contraseñas
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (password.length > 200) return "La contraseña es demasiado larga.";
  return null;
}

// ---------------------------------------------------------------------------
// Sesiones firmadas (cookie)
// ---------------------------------------------------------------------------

async function sessionSecret(): Promise<string> {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const client = await db();
  const existing = await client.execute("SELECT value FROM meta WHERE key = 'session_secret'");
  if (existing.rows[0]) return str(existing.rows[0].value);
  const secret = randomBytes(32).toString("base64url");
  await client.execute({
    sql: "INSERT OR IGNORE INTO meta (key, value) VALUES ('session_secret', ?)",
    args: [secret],
  });
  const stored = await client.execute("SELECT value FROM meta WHERE key = 'session_secret'");
  return str(stored.rows[0]?.value);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function startSession(staffId: number, sessionVersion: number): Promise<void> {
  const issuedAt = Date.now();
  const payload = `${staffId}.${sessionVersion}.${issuedAt}`;
  const value = `${payload}.${sign(payload, await sessionSecret())}`;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

function rowToStaff(row: Record<string, unknown>): Staff {
  return {
    id: num(row.id),
    name: str(row.name),
    username: str(row.username),
    role: str(row.role) === "owner" ? "owner" : "staff",
    active: num(row.active) === 1,
    createdAt: num(row.created_at),
  };
}

/** Usuario del equipo con sesión iniciada, o null. Se calcula una vez por petición. */
export const getCurrentStaff = cache(async (): Promise<Staff | null> => {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [idStr, versionStr, issuedStr, signature] = parts;
  const expected = sign(`${idStr}.${versionStr}.${issuedStr}`, await sessionSecret());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Date.now() - Number(issuedStr) > SESSION_MAX_AGE_S * 1000) return null;

  const client = await db();
  const result = await client.execute({
    sql: "SELECT * FROM staff WHERE id = ? AND active = 1 AND session_version = ?",
    args: [Number(idStr), Number(versionStr)],
  });
  const row = result.rows[0];
  return row ? rowToStaff(row) : null;
});

/** Exige sesión del equipo; si no hay, manda a la pantalla de entrada. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/panel/entrar");
  return staff;
}

/** Exige sesión de la dueña/o del negocio. */
export async function requireOwner(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "owner") redirect("/panel");
  return staff;
}

// ---------------------------------------------------------------------------
// Cuentas del equipo
// ---------------------------------------------------------------------------

export async function hasAnyStaff(): Promise<boolean> {
  const client = await db();
  const result = await client.execute("SELECT 1 FROM staff LIMIT 1");
  return result.rows.length > 0;
}

export async function findStaffForLogin(username: string) {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT * FROM staff WHERE username = ? AND active = 1",
    args: [username],
  });
  const row = result.rows[0];
  if (!row) return null;
  return { staff: rowToStaff(row), passwordHash: str(row.password_hash), sessionVersion: num(row.session_version) };
}

export async function listStaff(): Promise<Staff[]> {
  const client = await db();
  const result = await client.execute("SELECT * FROM staff ORDER BY role DESC, active DESC, name");
  return result.rows.map(rowToStaff);
}

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return "El usuario debe tener de 3 a 32 caracteres: letras, números, punto, guion o guion bajo.";
  }
  return null;
}

export async function createStaff(input: {
  name: string;
  username: string;
  password: string;
  role: Role;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const client = await db();
  const exists = await client.execute({ sql: "SELECT 1 FROM staff WHERE username = ?", args: [input.username] });
  if (exists.rows.length > 0) return { ok: false, error: "Ese usuario ya existe." };
  const result = await client.execute({
    sql: "INSERT INTO staff (name, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [input.name, input.username, await hashPassword(input.password), input.role, Date.now()],
  });
  return { ok: true, id: num(result.lastInsertRowid) };
}

/** Cambia la contraseña y cierra todas las sesiones abiertas de ese usuario. */
export async function setStaffPassword(staffId: number, password: string): Promise<number> {
  const client = await db();
  await client.execute({
    sql: "UPDATE staff SET password_hash = ?, session_version = session_version + 1 WHERE id = ?",
    args: [await hashPassword(password), staffId],
  });
  const result = await client.execute({ sql: "SELECT session_version FROM staff WHERE id = ?", args: [staffId] });
  return num(result.rows[0]?.session_version);
}

export async function setStaffActive(staffId: number, active: boolean): Promise<void> {
  const client = await db();
  await client.execute({
    sql: "UPDATE staff SET active = ?, session_version = session_version + 1 WHERE id = ? AND role = 'staff'",
    args: [active ? 1 : 0, staffId],
  });
}

export async function getStaffPasswordHash(staffId: number): Promise<string> {
  const client = await db();
  const result = await client.execute({ sql: "SELECT password_hash FROM staff WHERE id = ?", args: [staffId] });
  return str(result.rows[0]?.password_hash);
}
