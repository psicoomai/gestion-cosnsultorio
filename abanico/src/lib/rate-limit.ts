import "server-only";
import { headers } from "next/headers";

/**
 * Límite de intentos en memoria (por proceso). Suficiente para frenar
 * ataques de fuerza bruta en un solo servidor; en varios servidores cada uno
 * lleva su propia cuenta.
 */

type Bucket = { count: number; resetAt: number };

const globalForLimits = globalThis as unknown as { abanicoLimits?: Map<string, Bucket> };
const buckets = (globalForLimits.abanicoLimits ??= new Map<string, Bucket>());

/** Registra un intento. Devuelve false si ya se pasó del límite en la ventana. */
export function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clear(key: string): void {
  buckets.delete(key);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "local";
}
