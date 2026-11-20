import { randomBytes, randomInt } from "node:crypto";

export { formatCardCode, normalizeCardCode, tokenFromScan } from "@/lib/card-code";

/** Alfabeto sin caracteres que se confunden (0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Token secreto de la tarjeta (va en el enlace y en el QR). */
export function newCardToken(): string {
  return randomBytes(16).toString("base64url");
}

/** Código corto para buscar la tarjeta a mano, p. ej. "K7QM4P". */
export function newCardCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}
