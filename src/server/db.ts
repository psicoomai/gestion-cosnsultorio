// Conexión a la base de datos. En producción se usa PostgreSQL (variable
// DATABASE_URL, p. ej. Neon o Supabase). Sin DATABASE_URL se usa PGlite: un
// PostgreSQL embebido que guarda los datos en `.data/pglite`, para poder
// desarrollar y probar sin instalar nada. Las dos hablan el mismo SQL.

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    specialty text,
    password_hash text NOT NULL,
    privacy_accepted_at timestamptz NOT NULL,
    failed_logins integer NOT NULL DEFAULT 0,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash text PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS clinic_data (
    user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload text NOT NULL,
    version integer NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
];

type GlobalWithDb = typeof globalThis & { __consultorioDb?: Promise<Db> };

async function createPostgres(url: string): Promise<Db> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never[])) as unknown as T[];
    },
  };
}

async function createPglite(dataDir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(dataDir);
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await pg.query<T>(text, params)).rows;
    },
  };
}

async function migrate(db: Db): Promise<Db> {
  for (const statement of SCHEMA) await db.query(statement);
  return db;
}

async function connect(): Promise<Db> {
  // Vercel + Neon definen DATABASE_URL; algunas integraciones usan POSTGRES_URL.
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url && process.env.NODE_ENV === "production" && !process.env.PGLITE_DIR) {
    throw new Error(
      "Falta DATABASE_URL: en producción los datos deben guardarse en PostgreSQL (p. ej. Neon). Para probar con la base local, define PGLITE_DIR."
    );
  }
  const db = url ? await createPostgres(url) : await createPglite(process.env.PGLITE_DIR ?? ".data/pglite");
  return migrate(db);
}

/** Una sola conexión por proceso (sobrevive a la recarga en caliente de Next en desarrollo). */
export function getDb(): Promise<Db> {
  const g = globalThis as GlobalWithDb;
  g.__consultorioDb ??= connect().catch((err) => {
    g.__consultorioDb = undefined;
    throw err;
  });
  return g.__consultorioDb;
}

/** Solo para pruebas: una base de datos PGlite en memoria, ya con las tablas. */
export async function useTestDb(): Promise<Db> {
  const db = migrate(await createPglite("memory://"));
  (globalThis as GlobalWithDb).__consultorioDb = db;
  return db;
}
