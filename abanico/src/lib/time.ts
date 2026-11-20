/** Utilidades de fecha en la zona horaria del negocio. */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Mexico_City";

function partsInZone(ms: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Diferencia (ms) entre la hora local de la zona y UTC en ese instante. */
function zoneOffsetMs(ms: number, timeZone: string): number {
  const p = partsInZone(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Instante (ms) de la medianoche local del día que contiene `ms`, desplazado `daysAgo` días. */
export function startOfDay(ms: number, daysAgo = 0, timeZone = APP_TIMEZONE): number {
  const p = partsInZone(ms, timeZone);
  const localMidnightAsUtc = Date.UTC(p.year, p.month - 1, p.day - daysAgo);
  // Dos pasadas para cubrir cambios de horario entre `ms` y la medianoche.
  let guess = localMidnightAsUtc - zoneOffsetMs(ms, timeZone);
  guess = localMidnightAsUtc - zoneOffsetMs(guess, timeZone);
  return guess;
}

/** Clave "AAAA-MM-DD" del día local. */
export function dayKey(ms: number, timeZone = APP_TIMEZONE): string {
  const p = partsInZone(ms, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

const relative = new Intl.RelativeTimeFormat("es-MX", { numeric: "auto" });

/** "hace 5 minutos", "ayer", "hace 3 días"… */
export function timeAgo(ms: number, now = Date.now()): string {
  const diffSec = Math.round((ms - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return "justo ahora";
  if (abs < 3600) return relative.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return relative.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return relative.format(Math.round(diffSec / (86400 * 30)), "month");
  return relative.format(Math.round(diffSec / (86400 * 365)), "year");
}

export function formatDate(ms: number, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone, day: "numeric", month: "short", year: "numeric" }).format(ms);
}

export function formatDateTime(ms: number, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}
