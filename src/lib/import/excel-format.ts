// Interpreta un Excel de consultorio con el formato "una hoja por paciente":
//
//   Numero de sesión | Fecha de sesión | Costo de sesión | Pagado | Pendiente
//   | Total pagado | Fecha de pago | Total pendiente | Total real
//   | Forma de pago | Asistencia | Mes | Total
//
// y hojas de plataforma (p. ej. Spring Health) con "MES DONDE CORRESPONDE"
// en lugar de fecha de sesión. Las columnas se reconocen por su encabezado,
// no por su posición, así que el orden puede variar.
//
// IMPORTANTE: aquí se leen solo los datos capturados fila por fila (fecha,
// pagado, pendiente). Las fórmulas de totales del Excel (columna Mes/Total,
// hoja TOTALES) se ignoran a propósito: son justo donde suelen esconderse los
// errores, y la app recalcula todo desde las filas.
//
// Este archivo es puro (no depende de ExcelJS ni del navegador) para poder
// probarlo; `read-workbook.ts` convierte el archivo real a `RawSheet[]`.

export type RawCell = string | number | boolean | Date | null | undefined;

export interface RawSheet {
  name: string;
  /** Filas en orden; `rows[0]` es la fila 1 de Excel. Las celdas van en orden de columna (A = 0). */
  rows: RawCell[][];
  /**
   * Celdas que son copia de una celda combinada ("fila:columna", base 0).
   * Una fecha combinada aplica a todas sus filas; un monto combinado se
   * cuenta una sola vez (en la celda principal).
   */
  mergedCopies?: Set<string>;
}

export type ImportWarningKind =
  | "fecha-fuera-de-orden"
  | "anio-distinto"
  | "fecha-repetida"
  | "valor-no-numerico"
  | "sin-fecha"
  | "fecha-texto"
  | "fecha-pago-rara"
  | "mes-no-reconocido";

export interface ImportWarning {
  kind: ImportWarningKind;
  row: number; // número de fila de Excel
  message: string;
  /** Hay una corrección automática sugerida (se aplica si se activa "corregir años"). */
  fixable?: boolean;
}

export interface DraftSession {
  row: number;
  date: string; // yyyy-mm-dd, tal como viene en el Excel
  /** Fecha corregida sugerida cuando el año parece mal escrito. */
  fixedDate?: string;
  amount: number; // pagado + pendiente
  paid: number;
  paymentDate: string; // yyyy-mm-dd
  /** Fecha de pago corregida sugerida cuando el año parece mal escrito. */
  fixedPaymentDate?: string;
  /** `true` si la fecha de pago venía escrita en el Excel (si no, se usa la de la sesión). */
  paymentDateExplicit: boolean;
  note?: string;
}

export interface DraftPatient {
  sheetName: string;
  name: string;
  kind: "paciente" | "plataforma";
  costPerSession: number;
  sessions: DraftSession[];
  warnings: ImportWarning[];
  /** Filas con fecha pero sin pagado ni pendiente (sesiones futuras, gratuitas o sin capturar). */
  rowsWithoutAmount: number;
  paid: number;
  pending: number;
}

export interface IgnoredSheet {
  name: string;
  reason: string;
}

export interface ImportPreview {
  patients: DraftPatient[];
  ignored: IgnoredSheet[];
  paid: number;
  pending: number;
}

const MONTHS = [
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

function normalize(value: RawCell): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoFromParts(y: number, m: number, d: number): string | null {
  if (!Number.isInteger(y) || y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

/** Mes escrito con palabras, tolerando abreviaturas y errores de dedo ("abirl" → abril). */
function monthFromWord(word: string): number | null {
  const w = normalize(word).replace(/\./g, "");
  if (w.length < 3) return null;
  const exact = MONTHS.findIndex((m) => m === w || (w.length >= 3 && m.startsWith(w)));
  if (exact >= 0) return exact;
  if (w === "setiembre") return 8;
  let best: number | null = null;
  let bestDistance = 3;
  MONTHS.forEach((m, i) => {
    const d = levenshtein(w, m);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return bestDistance <= 2 ? best : null;
}

/** "9 abril 26", "9 de abril de 2026", "9-abr" → yyyy-mm-dd (sin año usa `fallbackYear`). */
export function parseSpanishTextDate(value: string, fallbackYear?: number): string | null {
  const m = normalize(value).match(/^(\d{1,2})\s*(?:de\s+|-|\/)?\s*([a-z.]+)\s*(?:de\s+|-|\/)?\s*(\d{2,4})?$/);
  if (!m) return null;
  const month = monthFromWord(m[2]);
  if (month === null) return null;
  const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : fallbackYear;
  if (!year) return null;
  return isoFromParts(year, month + 1, Number(m[1]));
}

/** Fecha de Excel (Date, número de serie o texto dd/mm/aaaa) a yyyy-mm-dd. */
export function toIsoDate(value: RawCell): string | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // ExcelJS entrega las fechas como medianoche UTC.
    return isoFromParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === "number" && value > 20000 && value < 80000) {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  if (typeof value === "string") {
    const t = value.trim();
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return isoFromParts(+m[1], +m[2], +m[3]);
    m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (m) {
      const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      return isoFromParts(year, +m[2], +m[1]);
    }
  }
  return null;
}

/** Número de una celda; `null` si está vacía; `NaN` si tiene texto que no es número. */
function toNumber(value: RawCell): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

function text(value: RawCell): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return undefined;
  const t = String(value).trim();
  return t === "" ? undefined : t;
}

function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const IGNORED_NAMES = [/^totales?$/, /^resumen/, /plantilla/, /^template$/];

type ColumnKey =
  | "date"
  | "cost"
  | "paid"
  | "pending"
  | "paymentDate"
  | "method"
  | "attendance"
  | "serviceMonth"
  | "receivedDate"
  | "bank"
  | "description";

/** Reconoce columnas por su encabezado (sin acentos ni mayúsculas). */
function mapHeader(header: RawCell[]): Partial<Record<ColumnKey, number>> {
  const map: Partial<Record<ColumnKey, number>> = {};
  header.forEach((cell, index) => {
    const h = normalize(cell);
    if (!h) return;
    const set = (key: ColumnKey) => {
      if (map[key] === undefined) map[key] = index;
    };
    if (h === "fecha de sesion" || h === "fecha sesion" || h === "fecha") set("date");
    else if (h.startsWith("costo")) set("cost");
    else if (h === "pagado" || h === "monto pagado") set("paid");
    else if (h === "pendiente" || h === "monto pendiente") set("pending");
    else if (h.startsWith("fecha de pago")) set("paymentDate");
    else if (h.startsWith("forma de pago") || h === "metodo de pago") set("method");
    else if (h.startsWith("asistencia")) set("attendance");
    else if (h.startsWith("mes donde corresponde") || h === "mes que corresponde") set("serviceMonth");
    else if (h.startsWith("fecha que recibi") || h.startsWith("fecha de recepcion")) set("receivedDate");
    else if (h.startsWith("banco")) set("bank");
    else if (h === "total pendiente") set("description");
  });
  return map;
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = 0;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount || (c === bestCount && v > best)) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

function finishDraft(
  sheet: RawSheet,
  kind: DraftPatient["kind"],
  sessions: DraftSession[],
  warnings: ImportWarning[],
  rowsWithoutAmount: number
): DraftPatient {
  return {
    sheetName: sheet.name,
    name: sheet.name.trim(),
    kind,
    costPerSession: mode(sessions.map((s) => s.amount).filter((a) => a > 0)),
    sessions,
    warnings,
    rowsWithoutAmount,
    paid: round2(sessions.reduce((sum, s) => sum + s.paid, 0)),
    pending: round2(sessions.reduce((sum, s) => sum + (s.amount - s.paid), 0)),
  };
}

function checkNumber(
  value: RawCell,
  column: string,
  row: number,
  warnings: ImportWarning[]
): number {
  const n = toNumber(value);
  if (n === null) return 0;
  if (Number.isNaN(n)) {
    warnings.push({
      kind: "valor-no-numerico",
      row,
      message: `Fila ${row}: "${String(value)}" en ${column} no es un número; no se importó ese monto.`,
    });
    return 0;
  }
  return n;
}

function withYear(iso: string, year: string): string | null {
  const candidate = `${year}${iso.slice(4)}`;
  return isoFromParts(Number(year), Number(candidate.slice(5, 7)), Number(candidate.slice(8, 10)));
}

function daysBetween(a: string, b: string): number {
  return (Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / (24 * 60 * 60 * 1000);
}

interface RawPatientRow {
  row: number;
  date: string | null;
  textDate?: string;
  paid: number;
  pending: number;
  paymentDate: string | null;
  note?: string;
}

function parsePatientSheet(sheet: RawSheet, cols: Partial<Record<ColumnKey, number>>): DraftPatient {
  const warnings: ImportWarning[] = [];
  const rawRows: RawPatientRow[] = [];
  let rowsWithoutAmount = 0;

  // 1. Leer filas tal como vienen.
  for (let i = 1; i < sheet.rows.length; i++) {
    const cells = sheet.rows[i] ?? [];
    const row = i + 1;
    const get = (key: ColumnKey) => (cols[key] === undefined ? undefined : cells[cols[key]!]);
    const amount = (key: ColumnKey) =>
      cols[key] !== undefined && sheet.mergedCopies?.has(`${i}:${cols[key]}`) ? undefined : get(key);
    const dateCell = get("date");
    const paid = round2(checkNumber(amount("paid"), "Pagado", row, warnings));
    const pending = round2(checkNumber(amount("pending"), "Pendiente", row, warnings));
    const date = toIsoDate(dateCell);
    if (paid + pending <= 0) {
      if (date) rowsWithoutAmount++;
      continue;
    }
    const noteParts = [text(get("method"))];
    if (normalize(get("attendance")) === "no") noteParts.push("No asistió");
    rawRows.push({
      row,
      date,
      textDate: !date && typeof dateCell === "string" ? dateCell : undefined,
      paid,
      pending,
      paymentDate: toIsoDate(get("paymentDate")),
      note: noteParts.filter(Boolean).join(" · ") || undefined,
    });
  }

  // 2. Año más común de la hoja (para detectar años mal escritos).
  const yearCounts = new Map<string, number>();
  for (const r of rawRows) if (r.date) yearCounts.set(r.date.slice(0, 4), (yearCounts.get(r.date.slice(0, 4)) ?? 0) + 1);
  const commonYear = [...yearCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const datedCount = [...yearCounts.values()].reduce((a, b) => a + b, 0);

  // 3. Construir sesiones, resolviendo fechas en texto o faltantes.
  const sessions: DraftSession[] = [];
  const seenDates = new Map<string, number>();
  for (const r of rawRows) {
    let date = r.date;
    const previous = sessions[sessions.length - 1];
    if (!date && r.textDate) {
      date = parseSpanishTextDate(r.textDate, commonYear ? Number(commonYear) : undefined);
      if (date) {
        warnings.push({
          kind: "fecha-texto",
          row: r.row,
          message: `Fila ${r.row}: la fecha está escrita como texto ("${r.textDate}"); se leyó como ${formatShort(date)}.`,
        });
      }
    }
    if (!date) {
      const fallback = previous ? (previous.fixedDate ?? previous.date) : null;
      if (!fallback) {
        warnings.push({
          kind: "sin-fecha",
          row: r.row,
          message: `Fila ${r.row}: tiene monto pero no tiene fecha de sesión y no hay una fila anterior de referencia; no se importó.`,
        });
        continue;
      }
      date = fallback;
      warnings.push({
        kind: "sin-fecha",
        row: r.row,
        message: `Fila ${r.row}: tiene monto pero no tiene fecha${r.textDate ? ` legible ("${r.textDate}")` : ""}; se usó la de la fila anterior (${formatShort(date)}) para no perder el monto. Corrígela después si hace falta.`,
      });
    }

    // Año atípico: casi todas las sesiones son de un año y esta no.
    let fixedDate: string | undefined;
    const y = date.slice(0, 4);
    if (commonYear && datedCount >= 3 && y !== commonYear && (yearCounts.get(y) ?? 0) <= Math.max(1, datedCount * 0.15)) {
      fixedDate = withYear(date, commonYear) ?? undefined;
      warnings.push({
        kind: "anio-distinto",
        row: r.row,
        fixable: Boolean(fixedDate),
        message: `Fila ${r.row}: la sesión dice ${formatShort(date)}, pero casi todas son de ${commonYear}.${fixedDate ? ` Se corregirá a ${formatShort(fixedDate)}.` : ""}`,
      });
    }
    const effective = fixedDate ?? date;

    const prevEffective = previous ? (previous.fixedDate ?? previous.date) : null;
    if (prevEffective && effective < prevEffective && daysBetween(effective, prevEffective) > 1) {
      warnings.push({
        kind: "fecha-fuera-de-orden",
        row: r.row,
        message: `Fila ${r.row}: la sesión del ${formatShort(effective)} aparece después de la del ${formatShort(prevEffective)}. ¿La fecha está mal escrita? Se contará en ${MONTHS[Number(effective.slice(5, 7)) - 1]}.`,
      });
    }
    if (seenDates.has(effective)) {
      warnings.push({
        kind: "fecha-repetida",
        row: r.row,
        message: `Fila ${r.row}: misma fecha (${formatShort(effective)}) que la fila ${seenDates.get(effective)}.`,
      });
    } else {
      seenDates.set(effective, r.row);
    }

    // Fecha de pago con año mal escrito (p. ej. 03/11/2025 para sesiones de octubre 2026).
    let fixedPaymentDate: string | undefined;
    if (r.paid > 0 && r.paymentDate) {
      const diff = daysBetween(effective, r.paymentDate);
      if (diff < -62 || diff > 366) {
        const candidate = withYear(r.paymentDate, effective.slice(0, 4));
        const candidateDiff = candidate ? daysBetween(effective, candidate) : Infinity;
        fixedPaymentDate = candidate && candidateDiff >= -62 && candidateDiff <= 120 ? candidate : undefined;
        warnings.push({
          kind: "fecha-pago-rara",
          row: r.row,
          fixable: Boolean(fixedPaymentDate),
          message: `Fila ${r.row}: la fecha de pago ${formatShort(r.paymentDate)} está muy lejos de la sesión del ${formatShort(effective)}.${fixedPaymentDate ? ` Se corregirá a ${formatShort(fixedPaymentDate)}.` : " Revisa el año."}`,
        });
      }
    }

    sessions.push({
      row: r.row,
      date,
      fixedDate,
      amount: round2(r.paid + r.pending),
      paid: r.paid,
      paymentDate: r.paid > 0 ? r.paymentDate ?? effective : effective,
      fixedPaymentDate,
      paymentDateExplicit: r.paid > 0 && Boolean(r.paymentDate),
      note: r.note,
    });
  }

  warnings.sort((a, b) => a.row - b.row);
  return finishDraft(sheet, "paciente", sessions, warnings, rowsWithoutAmount);
}

function monthIndexFromText(value: RawCell): number | null {
  const t = normalize(value);
  if (!t) return null;
  for (let i = 0; i < MONTHS.length; i++) {
    if (t.includes(MONTHS[i])) return i;
  }
  if (t.includes("setiembre")) return 8;
  return null;
}

/**
 * Hoja de plataforma: cada fila es un depósito que corresponde a un mes de
 * servicio. Se importa como una "sesión" por depósito, fechada el día 1 del
 * mes al que corresponde, ya pagada en la fecha en que se recibió.
 */
function parsePlatformSheet(sheet: RawSheet, cols: Partial<Record<ColumnKey, number>>): DraftPatient {
  const sessions: DraftSession[] = [];
  const warnings: ImportWarning[] = [];
  let lastMonth: number | null = null;
  let lastYear: number | null = null;

  for (let i = 1; i < sheet.rows.length; i++) {
    const cells = sheet.rows[i] ?? [];
    const row = i + 1;
    const get = (key: ColumnKey) => (cols[key] === undefined ? undefined : cells[cols[key]!]);
    const mergedCopy = cols.paid !== undefined && sheet.mergedCopies?.has(`${i}:${cols.paid}`);
    const paid = mergedCopy ? 0 : round2(checkNumber(get("paid"), "Pagado", row, warnings));
    const received = toIsoDate(get("receivedDate")) ?? toIsoDate(get("paymentDate"));
    const monthCell = get("serviceMonth");
    let month = monthIndexFromText(monthCell);
    if (paid <= 0) continue;

    if (month === null) {
      if (text(monthCell)) {
        warnings.push({
          kind: "mes-no-reconocido",
          row,
          message: `Fila ${row}: no se reconoce el mes "${text(monthCell)}".`,
        });
      }
      month = lastMonth ?? (received ? Number(received.slice(5, 7)) - 1 : null);
      if (month !== null && lastMonth !== null) {
        warnings.push({
          kind: "mes-no-reconocido",
          row,
          message: `Fila ${row}: no dice a qué mes corresponde; se asignó a ${MONTHS[month]} (igual que la fila anterior).`,
        });
      }
    }
    if (month === null) {
      warnings.push({
        kind: "mes-no-reconocido",
        row,
        message: `Fila ${row}: no tiene mes ni fecha; no se importó.`,
      });
      continue;
    }

    let year: number = received ? Number(received.slice(0, 4)) : lastYear ?? new Date().getFullYear();
    // Un depósito de enero que corresponde a diciembre es del año anterior.
    if (received && month > Number(received.slice(5, 7))) year -= 1;
    lastMonth = month;
    lastYear = year;

    // El primer depósito del mes se fecha el día 1 y los siguientes el 16
    // (segunda quincena), para que no parezcan sesiones repetidas.
    const monthKey = `${year}-${pad(month + 1)}`;
    const description = text(get("description"));
    const secondHalf =
      /segund/i.test(description ?? "") || sessions.some((s) => s.date.startsWith(monthKey));
    const date = `${monthKey}-${secondHalf ? "16" : "01"}`;
    const note = [description, text(get("bank"))].filter(Boolean).join(" · ") || undefined;
    sessions.push({ row, date, amount: paid, paid, paymentDate: received ?? date, paymentDateExplicit: false, note });
  }

  return finishDraft(sheet, "plataforma", sessions, warnings, 0);
}

export function parseWorkbook(sheets: RawSheet[]): ImportPreview {
  const patients: DraftPatient[] = [];
  const ignored: IgnoredSheet[] = [];

  for (const sheet of sheets) {
    const n = normalize(sheet.name);
    if (IGNORED_NAMES.some((re) => re.test(n))) {
      ignored.push({
        name: sheet.name,
        reason: n.includes("plantilla") || n === "template"
          ? "Es la plantilla."
          : "Es una hoja de totales: la app los recalcula desde las filas de cada paciente.",
      });
      continue;
    }
    const header = sheet.rows[0] ?? [];
    const cols = mapHeader(header);
    if (cols.paid === undefined) {
      ignored.push({ name: sheet.name, reason: 'No tiene una columna "Pagado" en la fila 1.' });
      continue;
    }
    if (cols.serviceMonth !== undefined) {
      patients.push(parsePlatformSheet(sheet, cols));
    } else if (cols.date !== undefined) {
      patients.push(parsePatientSheet(sheet, cols));
    } else {
      ignored.push({ name: sheet.name, reason: 'No tiene una columna "Fecha de sesión" en la fila 1.' });
    }
  }

  return {
    patients,
    ignored,
    paid: round2(patients.reduce((sum, p) => sum + p.paid, 0)),
    pending: round2(patients.reduce((sum, p) => sum + p.pending, 0)),
  };
}
