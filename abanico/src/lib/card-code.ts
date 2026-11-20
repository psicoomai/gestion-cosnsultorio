/** Funciones puras sobre el código de tarjeta (se pueden usar en el navegador). */

/** "K7QM4P" → "K7Q-M4P" */
export function formatCardCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

/** Limpia lo que escribe el personal: "k7q-m4p" → "K7QM4P" */
export function normalizeCardCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Extrae el token de lo que leyó el escáner: un enlace
 * "https://.../tarjeta/<token>" o el token solo.
 */
export function tokenFromScan(text: string): string | null {
  const trimmed = text.trim();
  const fromUrl = trimmed.match(/\/tarjeta\/([A-Za-z0-9_-]{16,64})(?:[/?#]|$)/);
  if (fromUrl) return fromUrl[1];
  if (/^[A-Za-z0-9_-]{16,64}$/.test(trimmed)) return trimmed;
  return null;
}
