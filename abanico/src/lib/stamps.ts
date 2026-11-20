/**
 * Reglas puras del programa (sin base de datos), para poder probarlas por
 * separado: tarjeta de sellos por niveles y cálculo de puntos.
 */

export type StampLevel = { at: number; title: string };

export type StampResult = {
  /** Sellos en la tarjeta actual después de aplicar el cambio. */
  stamps: number;
  /** Premios (títulos de nivel) que se ganaron con este cambio, en orden. */
  earned: string[];
  /** Cuántas veces se completó la tarjeta (y volvió a empezar). */
  cardsCompleted: number;
};

/** Número de sellos de una tarjeta completa: el nivel más alto. */
export function cardLength(levels: StampLevel[]): number {
  return levels.reduce((max, level) => Math.max(max, level.at), 0);
}

/**
 * Suma `amount` sellos a una tarjeta que tiene `current` sellos. Al pasar por
 * el sello de cada nivel se gana su premio; al llegar al último nivel la
 * tarjeta se completa y vuelve a empezar desde cero con los sellos sobrantes.
 */
export function applyStamps(current: number, amount: number, levels: StampLevel[]): StampResult {
  if (!Number.isInteger(amount) || amount < 1) throw new Error("amount debe ser un entero positivo");
  const length = cardLength(levels);
  if (length < 1) throw new Error("La tarjeta necesita al menos un nivel");
  const byPosition = new Map(levels.map((level) => [level.at, level.title]));

  // Si la tarjeta se acortó en Ajustes, el cliente queda a un sello de completarla.
  let stamps = Math.min(Math.max(0, current), length - 1);
  const earned: string[] = [];
  let cardsCompleted = 0;
  for (let i = 0; i < amount; i++) {
    stamps += 1;
    const title = byPosition.get(stamps);
    if (title) earned.push(title);
    if (stamps >= length) {
      stamps = 0;
      cardsCompleted += 1;
    }
  }
  return { stamps, earned, cardsCompleted };
}

/** Siguiente nivel por alcanzar desde `stamps` sellos (o null si no hay niveles). */
export function nextLevel(stamps: number, levels: StampLevel[]): (StampLevel & { remaining: number }) | null {
  const sorted = [...levels].sort((a, b) => a.at - b.at);
  const next = sorted.find((level) => level.at > stamps) ?? sorted[0];
  if (!next) return null;
  const remaining = next.at > stamps ? next.at - stamps : next.at;
  return { ...next, remaining };
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

/** "85.50", "$1,200", "85" → centavos. null si no es un monto válido. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[$\s,]/g, "");
  if (!cleaned) return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const LEVEL_MAX_AT = 50;
export const MAX_LEVELS = 10;
export const MAX_STAMPS_PER_VISIT = 10;
