/**
 * Reglas puras del programa (sin base de datos), para poder probarlas por
 * separado: tarjeta de sellos y cálculo de puntos.
 */

export type StampResult = {
  /** Sellos en la tarjeta actual después de aplicar el cambio. */
  stamps: number;
  /** Recompensas que se ganaron con este cambio (tarjetas completadas). */
  rewardsEarned: number;
};

/**
 * Suma `amount` sellos a una tarjeta que tiene `current` sellos. Cada vez que
 * se completan `required` sellos se gana la recompensa y la tarjeta vuelve a
 * empezar con los sellos sobrantes.
 */
export function applyStamps(current: number, amount: number, required: number): StampResult {
  if (!Number.isInteger(amount) || amount < 1) throw new Error("amount debe ser un entero positivo");
  if (!Number.isInteger(required) || required < 1) throw new Error("required debe ser un entero positivo");
  // Si la tarjeta se acortó en Ajustes, el cliente queda a un sello de completarla.
  let stamps = Math.min(Math.max(0, current), required - 1) + amount;
  let rewardsEarned = 0;
  while (stamps >= required) {
    stamps -= required;
    rewardsEarned += 1;
  }
  return { stamps, rewardsEarned };
}

/** Minutos que faltan para poder volver a sellar (0 si ya se puede). */
export function cooldownRemainingMinutes(lastStampAt: number | null, cooldownMinutes: number, now: number): number {
  if (!lastStampAt || cooldownMinutes <= 0) return 0;
  const remainingMs = cooldownMinutes * 60_000 - (now - lastStampAt);
  return remainingMs > 0 ? Math.ceil(remainingMs / 60_000) : 0;
}

/**
 * Puntos que gana una compra: `earnPoints` puntos por cada `earnAmount`
 * pesos completos. P. ej. 1 punto por cada $10 → una compra de $85 da 8.
 */
export function pointsForPurchase(purchaseCents: number, earnAmount: number, earnPoints: number): number {
  if (!(purchaseCents > 0) || !(earnAmount > 0) || !(earnPoints > 0)) return 0;
  return Math.floor(purchaseCents / (earnAmount * 100)) * earnPoints;
}

/**
 * Saldo a favor (centavos) que genera una compra con reembolso del
 * `percent` %. Se redondea hacia abajo al centavo.
 */
export function creditForPurchase(purchaseCents: number, percent: number): number {
  if (!(purchaseCents > 0) || !(percent > 0)) return 0;
  return Math.floor((purchaseCents * percent) / 100);
}

/** "85.50", "$1,200", "85" → centavos. null si no es un monto válido. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[$\s,]/g, "");
  if (!cleaned) return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const CASHBACK_MIN = 1;
export const CASHBACK_MAX = 50;
export const STAMPS_MIN = 2;
export const STAMPS_MAX = 30;
export const MAX_STAMPS_PER_VISIT = 10;
