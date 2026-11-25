// Capa de almacenamiento. Hoy los datos se guardan en el propio navegador
// (IndexedDB): no salen del dispositivo de quien usa la app. Toda la app
// habla con esta interfaz (`ClinicStore`), así que cuando exista un backend
// con cuentas de usuario basta con escribir otra implementación (p. ej.
// `createApiStore`) sin tocar pantallas ni cálculos.

import type { Patient, Payment, Profile, Session, Vacation } from "@/lib/types";

export const SNAPSHOT_VERSION = 1;

export interface ClinicData {
  patients: Patient[];
  sessions: Session[];
  payments: Payment[];
  /** Vacaciones propias. Opcional para leer respaldos anteriores. */
  vacations?: Vacation[];
}

export interface ClinicSnapshot extends ClinicData {
  version: typeof SNAPSHOT_VERSION;
  profile: Profile | null;
  updatedAt: string;
}

export interface ClinicStore {
  load(): Promise<ClinicSnapshot | null>;
  save(snapshot: ClinicSnapshot): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = "consultorio";
const STORE_NAME = "estado";
const KEY = "snapshot";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const request = fn(tx.objectStore(STORE_NAME));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result as T);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

/** Guarda todo en IndexedDB del navegador. Si no está disponible, queda solo en memoria. */
export function createBrowserStore(): ClinicStore {
  const available = typeof indexedDB !== "undefined";
  let memory: ClinicSnapshot | null = null;

  return {
    async load() {
      if (!available) return memory;
      const raw = await run<unknown>("readonly", (s) => s.get(KEY));
      return raw ? parseSnapshot(raw) : null;
    },
    async save(snapshot) {
      if (!available) {
        memory = snapshot;
        return;
      }
      await run("readwrite", (s) => s.put(snapshot, KEY));
    },
    async clear() {
      memory = null;
      if (available) await run("readwrite", (s) => s.delete(KEY));
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Valida un respaldo (o lo guardado en el navegador) antes de usarlo. Lanza
 * un Error con un mensaje en español si la forma no es la esperada.
 */
export function parseSnapshot(raw: unknown): ClinicSnapshot {
  if (!isObject(raw)) throw new Error("El archivo no contiene un respaldo válido.");
  const { patients, sessions, payments, profile, vacations } = raw;
  if (!Array.isArray(patients) || !Array.isArray(sessions) || !Array.isArray(payments)) {
    throw new Error("El respaldo no tiene pacientes, sesiones y pagos.");
  }
  const patientIds = new Set<string>();
  for (const p of patients) {
    if (!isObject(p) || typeof p.id !== "string" || typeof p.name !== "string") {
      throw new Error("Hay un paciente sin id o sin nombre en el respaldo.");
    }
    patientIds.add(p.id);
  }
  for (const s of sessions) {
    if (
      !isObject(s) ||
      typeof s.id !== "string" ||
      typeof s.date !== "string" ||
      typeof s.amount !== "number" ||
      !patientIds.has(String(s.patientId))
    ) {
      throw new Error("Hay una sesión incompleta o de un paciente que no existe en el respaldo.");
    }
  }
  for (const p of payments) {
    if (
      !isObject(p) ||
      typeof p.id !== "string" ||
      typeof p.amount !== "number" ||
      !Array.isArray(p.sessionIds) ||
      !patientIds.has(String(p.patientId))
    ) {
      throw new Error("Hay un pago incompleto o de un paciente que no existe en el respaldo.");
    }
  }
  const validVacations = Array.isArray(vacations)
    ? vacations.filter(
        (v): v is Vacation =>
          isObject(v) && typeof v.id === "string" && typeof v.start === "string" && typeof v.end === "string"
      )
    : [];
  return {
    version: SNAPSHOT_VERSION,
    profile: isObject(profile) && typeof profile.name === "string" ? (profile as unknown as Profile) : null,
    vacations: validVacations,
    patients: patients as Patient[],
    sessions: sessions as Session[],
    payments: payments as Payment[],
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}
