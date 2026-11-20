import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient, type Client, type InValue } from "@libsql/client";

/**
 * Conexión única a la base de datos (SQLite local o Turso) y creación del
 * esquema. Todas las tablas se crean de forma idempotente al primer uso.
 */

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    business_name TEXT NOT NULL,
    reward_terms TEXT NOT NULL,
    stamps_enabled INTEGER NOT NULL DEFAULT 1,
    stamps_required INTEGER NOT NULL DEFAULT 10,
    reward_title TEXT NOT NULL DEFAULT 'Un producto de cortesía',
    points_enabled INTEGER NOT NULL DEFAULT 1,
    welcome_stamps INTEGER NOT NULL DEFAULT 0,
    cooldown_minutes INTEGER NOT NULL DEFAULT 0,
    earn_amount INTEGER NOT NULL DEFAULT 10,
    earn_points INTEGER NOT NULL DEFAULT 1,
    cashback_enabled INTEGER NOT NULL DEFAULT 0,
    cashback_percent INTEGER NOT NULL DEFAULT 10,
    updated_at INTEGER NOT NULL
  )`,
  // Catálogo de premios que se cambian por puntos.
  `CREATE TABLE IF NOT EXISTS point_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    cost INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'staff')),
    active INTEGER NOT NULL DEFAULT 1,
    session_version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    birthday TEXT,
    stamps INTEGER NOT NULL DEFAULT 0,
    total_stamps INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    total_points INTEGER NOT NULL DEFAULT 0,
    credit_cents INTEGER NOT NULL DEFAULT 0,
    total_credit_cents INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_stamp_at INTEGER,
    last_visit_at INTEGER
  )`,
  // Premios ganados con sellos (pendientes hasta que se canjean) y premios
  // canjeados con puntos (se registran ya canjeados).
  `CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('stamps', 'points')),
    title TEXT NOT NULL,
    points_cost INTEGER,
    earned_at INTEGER NOT NULL,
    redeemed_at INTEGER,
    redeemed_by INTEGER REFERENCES staff(id)
  )`,
  `CREATE INDEX IF NOT EXISTS rewards_customer ON rewards(customer_id, redeemed_at)`,
  `CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    staff_id INTEGER REFERENCES staff(id),
    type TEXT NOT NULL CHECK (type IN (
      'join', 'stamp', 'unstamp', 'reward_earned', 'reward_redeemed',
      'points_earned', 'points_redeemed', 'points_removed',
      'credit_earned', 'credit_used'
    )),
    amount INTEGER NOT NULL DEFAULT 0,
    purchase_cents INTEGER,
    detail TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS activity_created ON activity(created_at)`,
  `CREATE INDEX IF NOT EXISTS activity_customer ON activity(customer_id, created_at)`,
];

/** Catálogo de puntos inicial (editable en Ajustes). */
const DEFAULT_CATALOG: [string, number][] = [
  ["Café", 100],
  ["Sándwich", 500],
];

const globalForDb = globalThis as unknown as {
  abanicoDb?: Client;
  abanicoDbReady?: Promise<Client>;
};

function createDbClient(): Client {
  const url = process.env.DATABASE_URL || "file:./data/abanico.db";
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length);
    mkdirSync(dirname(resolve(filePath)), { recursive: true });
  }
  return createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  });
}

async function init(client: Client): Promise<Client> {
  await client.execute("PRAGMA foreign_keys = ON");
  await client.batch(SCHEMA, "write");
  const now = Date.now();
  const seeded = await client.execute({
    sql: `INSERT OR IGNORE INTO settings (id, business_name, reward_terms, updated_at)
          VALUES (1, 'Abanico', 'Válido en tu siguiente visita. No acumulable con otras promociones.', ?)`,
    args: [now],
  });
  if (seeded.rowsAffected > 0) {
    await client.batch(
      [
        ...DEFAULT_CATALOG.map(([title, cost]) => ({
          sql: "INSERT INTO point_rewards (title, cost, created_at) VALUES (?, ?, ?)",
          args: [title, cost, now],
        })),
      ],
      "write"
    );
  }
  return client;
}

/** Devuelve el cliente de base de datos con el esquema ya creado. */
export function db(): Promise<Client> {
  if (!globalForDb.abanicoDbReady) {
    globalForDb.abanicoDb = createDbClient();
    globalForDb.abanicoDbReady = init(globalForDb.abanicoDb).catch((error) => {
      globalForDb.abanicoDbReady = undefined;
      throw error;
    });
  }
  return globalForDb.abanicoDbReady;
}

export type Row = Record<string, InValue>;

export function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

export function numOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : num(value);
}

export function str(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}
