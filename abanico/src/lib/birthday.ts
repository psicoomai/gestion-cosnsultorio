export const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Día y mes del formulario → "MM-DD". Vacío → null. Inválido → "invalid". */
export function parseBirthday(dayInput: string, monthInput: string): string | null | "invalid" {
  const day = dayInput.trim();
  const month = monthInput.trim();
  if (!day && !month) return null;
  const d = Number(day);
  const m = Number(month);
  if (!Number.isInteger(d) || !Number.isInteger(m) || m < 1 || m > 12 || d < 1 || d > DAYS_IN_MONTH[m - 1]) {
    return "invalid";
  }
  return `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "03-14" → "14 de marzo" */
export function formatBirthday(birthday: string | null): string {
  if (!birthday) return "";
  const [m, d] = birthday.split("-").map(Number);
  if (!m || !d) return "";
  return `${d} de ${MONTHS[m - 1]}`;
}

export function splitBirthday(birthday: string | null): { day: string; month: string } {
  if (!birthday) return { day: "", month: "" };
  const [m, d] = birthday.split("-");
  return { day: String(Number(d)), month: String(Number(m)) };
}
