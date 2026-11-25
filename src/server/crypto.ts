// Criptografía del servidor:
// - Contraseñas con scrypt y sal aleatoria (nunca se guardan en claro).
// - Tokens de sesión aleatorios; en la base de datos solo se guarda su hash.
// - Los datos del consultorio se cifran con AES-256-GCM antes de guardarse,
//   con la llave DATA_ENCRYPTION_KEY: aunque alguien obtuviera una copia de
//   la base de datos, no podría leer nombres de pacientes ni montos.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

function scrypt(password: string, salt: Buffer, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password, salt, length, SCRYPT_OPTIONS, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return ["scrypt", salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Mismo costo que una verificación real, para no revelar si un correo tiene cuenta. */
export async function dummyPasswordCheck(password: string): Promise<void> {
  await scrypt(password, Buffer.alloc(16), KEY_LENGTH);
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

let warnedDevKey = false;

function encryptionKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (raw) {
    const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
    if (key.length !== 32) {
      throw new Error("DATA_ENCRYPTION_KEY debe ser de 32 bytes (64 caracteres hexadecimales o base64).");
    }
    return key;
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_ENCRYPTION_KEY !== "1") {
    throw new Error("Falta DATA_ENCRYPTION_KEY: es obligatoria en producción para cifrar los datos.");
  }
  if (!warnedDevKey) {
    console.warn("[consultorio] DATA_ENCRYPTION_KEY no está definida: se usa una llave solo para desarrollo.");
    warnedDevKey = true;
  }
  return createHash("sha256").update("consultorio-llave-de-desarrollo").digest();
}

export function encryptText(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptText(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1") throw new Error("Formato de datos cifrados desconocido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
