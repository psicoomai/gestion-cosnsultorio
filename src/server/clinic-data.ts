// Datos del consultorio de cada cuenta. Se guardan como un documento cifrado
// por cuenta, con número de versión: si dos dispositivos guardan a la vez, el
// segundo recibe un conflicto en lugar de borrar sin aviso lo del primero.

import { getDb } from "@/server/db";
import { decryptText, encryptText } from "@/server/crypto";
import { HttpError } from "@/server/http";
import { parseSnapshot, type ClinicSnapshot } from "@/lib/storage";

export const MAX_DATA_BYTES = 4 * 1024 * 1024;

export async function loadClinicData(userId: string): Promise<{ snapshot: ClinicSnapshot | null; version: number }> {
  const db = await getDb();
  const [row] = await db.query<{ payload: string; version: number }>(
    `SELECT payload, version FROM clinic_data WHERE user_id = $1`,
    [userId]
  );
  if (!row) return { snapshot: null, version: 0 };
  return { snapshot: parseSnapshot(JSON.parse(decryptText(row.payload))), version: Number(row.version) };
}

export async function saveClinicData(userId: string, raw: unknown, expectedVersion: unknown): Promise<number> {
  let snapshot: ClinicSnapshot;
  try {
    snapshot = parseSnapshot(raw);
  } catch (err) {
    throw new HttpError(400, err instanceof Error ? err.message : "Datos inválidos.", "invalid_data");
  }
  const version = Number(expectedVersion);
  if (!Number.isInteger(version) || version < 0) {
    throw new HttpError(400, "Falta la versión de los datos.", "invalid_version");
  }
  const payload = encryptText(JSON.stringify(snapshot));
  const db = await getDb();

  if (version === 0) {
    const inserted = await db.query<{ version: number }>(
      `INSERT INTO clinic_data (user_id, payload, version) VALUES ($1, $2, 1)
       ON CONFLICT (user_id) DO NOTHING RETURNING version`,
      [userId, payload]
    );
    if (inserted.length === 0) throw conflict();
    return 1;
  }
  const updated = await db.query<{ version: number }>(
    `UPDATE clinic_data SET payload = $2, version = version + 1, updated_at = now()
     WHERE user_id = $1 AND version = $3 RETURNING version`,
    [userId, payload, version]
  );
  if (updated.length === 0) throw conflict();
  return Number(updated[0].version);
}

function conflict() {
  return new HttpError(
    409,
    "Tus datos cambiaron desde otro dispositivo o pestaña. Recarga la página para ver la versión más reciente.",
    "conflict"
  );
}
