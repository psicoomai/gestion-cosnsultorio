/**
 * Normaliza un teléfono de México a 10 dígitos.
 * Acepta formatos como "55 1234 5678", "+52 55 1234 5678", "521 55 1234 5678".
 * Devuelve null si no es un número válido de 10 dígitos.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("521")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("52")) digits = digits.slice(2);
  if (digits.length !== 10) return null;
  return digits;
}

/** "5512345678" → "55 1234 5678" */
export function formatPhone(phone: string): string {
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 2)} ${phone.slice(2, 6)} ${phone.slice(6)}`;
}

/** Enlace de WhatsApp (wa.me) para un teléfono de México con un mensaje prellenado. */
export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/52${phone}?text=${encodeURIComponent(message)}`;
}
