// Exporta el año a un Excel con el mismo formato que usa un consultorio
// (hoja TOTALES + una hoja por paciente), pero construido para que no pueda
// descuadrarse:
//
// - En cada hoja de paciente, el total de cada mes se calcula con SUMIFS
//   sobre la FECHA de la sesión, no con rangos de filas escritos a mano: una
//   fila nueva cae sola en su mes y ninguna fila puede contarse dos veces.
// - TOTALES tiene una tabla paciente × mes con una fila por cada hoja; COBRADO
//   y cada mes se suman desde esa tabla, así que ningún paciente puede quedar
//   fuera de la suma.
// - Una celda DIFERENCIA (COBRADO − TOTAL de meses) debe marcar 0.
//
// Cada fórmula lleva su resultado precalculado para que el archivo se vea
// bien incluso en visores que no recalculan.

import type ExcelJSType from "exceljs";
import { allocatePayments, roundCents } from "@/lib/metrics";
import type { Patient, Payment, Session } from "@/lib/types";

type ExcelJSModule = typeof ExcelJSType;
type Worksheet = ExcelJSType.Worksheet;

const MONTHS = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];
const SHORT_MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const MONEY = "#,##0.00";
const DATE = "dd/mm/yyyy";
const FONT = "Arial";
const MATRIX_HEADER_ROW = 20;

/** Nombre de hoja válido en Excel: sin []:*?/\, máximo 31 caracteres y único. */
export function safeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[[\]:*?/\\]/g, " ").replace(/^'+|'+$/g, "").replace(/\s+/g, " ").trim();
  if (!base || /^totales$/i.test(base)) base = `Paciente ${base}`.trim();
  base = base.slice(0, 31).trim();
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n++})`;
    candidate = `${base.slice(0, 31 - suffix.length).trim()}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/** Referencia a otra hoja: 'Nombre con espacios'!F2 (las comillas simples se duplican). */
export function sheetRef(sheetName: string, cell: string): string {
  return `'${sheetName.replace(/'/g, "''")}'!${cell}`;
}

function excelDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function styleHeader(ws: Worksheet, row: number, from: number, to: number) {
  for (let c = from; c <= to; c++) {
    const cell = ws.getCell(row, c);
    cell.font = { name: FONT, bold: true };
    cell.border = { bottom: { style: "thin" } };
  }
}

interface PatientSheetInfo {
  sheetName: string;
  paid: number;
  pending: number;
  monthPaid: number[];
  monthPending: number[];
}

function writePatientSheet(
  ws: Worksheet,
  year: number,
  sessions: Session[],
  paidBySession: Map<string, number>,
  lastPaymentBySession: Map<string, Payment>
): Omit<PatientSheetInfo, "sheetName"> {
  ws.columns = [
    { header: "Número de sesión", width: 10 },
    { header: "Fecha de sesión", width: 14 },
    { header: "Costo de sesión", width: 13 },
    { header: "Pagado", width: 12 },
    { header: "Pendiente", width: 12 },
    { header: "Total pagado", width: 13 },
    { header: "Fecha de pago", width: 14 },
    { header: "Total pendiente", width: 14 },
    { header: "Total real", width: 13 },
    { header: "Forma de pago / nota", width: 26 },
    { header: "", width: 3 },
    { header: "Mes", width: 13 },
    { header: "Cobrado", width: 13 },
    { header: "Pendiente", width: 13 },
  ];
  styleHeader(ws, 1, 1, 14);
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const monthPaid = Array(12).fill(0) as number[];
  const monthPending = Array(12).fill(0) as number[];
  let paid = 0;
  let pending = 0;

  sessions.forEach((session, index) => {
    const r = index + 2;
    const sessionPaid = roundCents(Math.min(paidBySession.get(session.id) ?? 0, session.amount));
    const sessionPending = roundCents(session.amount - sessionPaid);
    const month = Number(session.date.slice(5, 7)) - 1;
    monthPaid[month] += sessionPaid;
    monthPending[month] += sessionPending;
    paid += sessionPaid;
    pending += sessionPending;

    const payment = lastPaymentBySession.get(session.id);
    ws.getCell(r, 1).value = index + 1;
    ws.getCell(r, 2).value = excelDate(session.date);
    ws.getCell(r, 2).numFmt = DATE;
    ws.getCell(r, 3).value = session.amount;
    ws.getCell(r, 4).value = sessionPaid;
    ws.getCell(r, 5).value = { formula: `C${r}-D${r}`, result: sessionPending };
    if (payment) {
      ws.getCell(r, 7).value = excelDate(payment.date);
      ws.getCell(r, 7).numFmt = DATE;
    }
    const note = [payment?.method, session.note].filter(Boolean).join(" · ");
    if (note) ws.getCell(r, 10).value = note;
    for (const c of [3, 4, 5]) ws.getCell(r, c).numFmt = MONEY;
  });

  paid = roundCents(paid);
  pending = roundCents(pending);
  ws.getCell("F2").value = { formula: "SUM(D:D)", result: paid };
  ws.getCell("H2").value = { formula: "SUM(E:E)", result: pending };
  ws.getCell("I2").value = { formula: "F2+H2", result: roundCents(paid + pending) };
  for (const a of ["F2", "H2", "I2"]) ws.getCell(a).numFmt = MONEY;

  for (let m = 0; m < 12; m++) {
    const r = m + 2;
    const range = `$B:$B,">="&DATE(${year},${m + 1},1),$B:$B,"<"&DATE(${year},${m + 2},1)`;
    ws.getCell(r, 12).value = MONTHS[m];
    ws.getCell(r, 13).value = { formula: `SUMIFS($D:$D,${range})`, result: roundCents(monthPaid[m]) };
    ws.getCell(r, 14).value = { formula: `SUMIFS($E:$E,${range})`, result: roundCents(monthPending[m]) };
    ws.getCell(r, 13).numFmt = MONEY;
    ws.getCell(r, 14).numFmt = MONEY;
  }
  ws.getCell("L15").value = "TOTAL";
  ws.getCell("M15").value = { formula: "SUM(M2:M13)", result: paid };
  ws.getCell("N15").value = { formula: "SUM(N2:N13)", result: pending };
  ws.getCell("L16").value = "DIFERENCIA";
  ws.getCell("M16").value = { formula: "ROUND(F2-M15,2)", result: 0 };
  for (const a of ["L15", "M15", "N15", "L16", "M16"]) {
    ws.getCell(a).font = { name: FONT, bold: true };
    if (a.startsWith("M") || a.startsWith("N")) ws.getCell(a).numFmt = MONEY;
  }

  return {
    paid,
    pending,
    monthPaid: monthPaid.map(roundCents),
    monthPending: monthPending.map(roundCents),
  };
}

interface MatrixLayout {
  first: number;
  last: number;
  totalRow: number;
}

/**
 * Tabla paciente × mes en TOTALES, una fila por hoja de paciente. Cada celda
 * apunta a la celda del mes en la hoja del paciente; la fila TOTAL suma la
 * columna. Así ningún paciente puede quedar fuera de la suma.
 */
function writeMatrix(
  ws: Worksheet,
  headerRow: number,
  title: string,
  totalHeader: string,
  infos: PatientSheetInfo[],
  monthColumnInSheet: "M" | "N",
  totalCellInSheet: "F2" | "H2",
  monthValues: (info: PatientSheetInfo) => number[],
  totalValue: (info: PatientSheetInfo) => number
): MatrixLayout {
  const first = headerRow + 1;
  const last = headerRow + infos.length;
  const totalRow = last + 1;
  ws.getCell(headerRow - 1, 1).value = title;
  ws.getCell(headerRow - 1, 1).font = { name: FONT, bold: true };
  const headers = ["Paciente", ...SHORT_MONTHS, totalHeader];
  headers.forEach((h, i) => (ws.getCell(headerRow, i + 1).value = h));
  styleHeader(ws, headerRow, 1, headers.length);

  infos.forEach((info, i) => {
    const r = first + i;
    const months = monthValues(info);
    ws.getCell(r, 1).value = info.sheetName;
    for (let m = 0; m < 12; m++) {
      ws.getCell(r, m + 2).value = {
        formula: sheetRef(info.sheetName, `${monthColumnInSheet}${m + 2}`),
        result: months[m],
      };
    }
    ws.getCell(r, 14).value = { formula: sheetRef(info.sheetName, totalCellInSheet), result: totalValue(info) };
  });

  ws.getCell(totalRow, 1).value = "TOTAL";
  for (let c = 2; c <= 14; c++) {
    const result = roundCents(
      infos.reduce((s, info) => s + (c <= 13 ? monthValues(info)[c - 2] : totalValue(info)), 0)
    );
    const letter = ws.getColumn(c).letter;
    ws.getCell(totalRow, c).value =
      infos.length > 0 ? { formula: `SUM(${letter}${first}:${letter}${last})`, result } : 0;
  }
  for (let c = 1; c <= 14; c++) {
    ws.getCell(totalRow, c).font = { name: FONT, bold: true };
    ws.getCell(totalRow, c).border = { top: { style: "thin" } };
  }
  for (let r = first; r <= totalRow; r++) {
    for (let c = 2; c <= 14; c++) ws.getCell(r, c).numFmt = MONEY;
  }
  return { first, last, totalRow };
}

function writeTotalsSheet(ws: Worksheet, year: number, infos: PatientSheetInfo[]) {
  const paid = roundCents(infos.reduce((s, i) => s + i.paid, 0));
  const pending = roundCents(infos.reduce((s, i) => s + i.pending, 0));

  ws.getColumn(1).width = 30;
  for (let c = 2; c <= 14; c++) ws.getColumn(c).width = 13;
  ws.getColumn(5).width = 26;

  const paidMatrix = writeMatrix(
    ws,
    MATRIX_HEADER_ROW,
    `COBRADO POR PACIENTE Y MES ${year}`,
    "Total cobrado",
    infos,
    "M",
    "F2",
    (i) => i.monthPaid,
    (i) => i.paid
  );
  const pendingMatrix = writeMatrix(
    ws,
    paidMatrix.totalRow + 4,
    `POR COBRAR POR PACIENTE Y MES ${year}`,
    "Total por cobrar",
    infos,
    "N",
    "H2",
    (i) => i.monthPending,
    (i) => i.pending
  );

  // Resumen arriba: REAL = COBRADO + POR COBRAR, tomados de la fila TOTAL de cada tabla.
  ws.getCell("A1").value = "REAL";
  ws.getCell("B1").value = "COBRADO";
  ws.getCell("C1").value = "POR COBRAR";
  styleHeader(ws, 1, 1, 3);
  ws.getCell("B2").value = { formula: `N${paidMatrix.totalRow}`, result: paid };
  ws.getCell("C2").value = { formula: `N${pendingMatrix.totalRow}`, result: pending };
  ws.getCell("A2").value = { formula: "B2+C2", result: roundCents(paid + pending) };

  // Ingresos mensuales: cada mes es la fila TOTAL de su columna en las tablas.
  ws.getCell("E1").value = `INGRESOS MENSUALES ${year}`;
  ws.getCell("F1").value = "COBRADO";
  ws.getCell("G1").value = "POR COBRAR";
  styleHeader(ws, 1, 5, 7);
  MONTHS.forEach((name, m) => {
    const r = m + 2;
    const letter = ws.getColumn(m + 2).letter;
    ws.getCell(r, 5).value = name;
    ws.getCell(r, 6).value = {
      formula: `${letter}${paidMatrix.totalRow}`,
      result: roundCents(infos.reduce((s, i) => s + i.monthPaid[m], 0)),
    };
    ws.getCell(r, 7).value = {
      formula: `${letter}${pendingMatrix.totalRow}`,
      result: roundCents(infos.reduce((s, i) => s + i.monthPending[m], 0)),
    };
    ws.getCell(r, 6).numFmt = MONEY;
    ws.getCell(r, 7).numFmt = MONEY;
  });
  ws.getCell("E15").value = "TOTAL";
  ws.getCell("F15").value = { formula: "SUM(F2:F13)", result: paid };
  ws.getCell("G15").value = { formula: "SUM(G2:G13)", result: pending };
  ws.getCell("E17").value = "DIFERENCIA";
  ws.getCell("F17").value = { formula: "ROUND(B2-F15,2)", result: 0 };
  ws.getCell("E18").value = "Debe ser 0. Si no, algo no cuadra.";
  ws.getCell("E18").font = { name: FONT, italic: true, size: 9 };
  for (const a of ["E15", "F15", "G15", "E17", "F17"]) ws.getCell(a).font = { name: FONT, bold: true };
  for (const a of ["A2", "B2", "C2", "F15", "G15", "F17"]) ws.getCell(a).numFmt = MONEY;
}

/**
 * Construye el libro del año. Recibe el módulo de ExcelJS para poder usarlo
 * tanto en el navegador (import dinámico) como en pruebas con Node.
 */
export function buildYearWorkbook(
  ExcelJS: ExcelJSModule,
  patients: Patient[],
  sessions: Session[],
  payments: Payment[],
  year: number
): ExcelJSType.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Consultorio";
  workbook.calcProperties = { fullCalcOnLoad: true };

  const { sessionPaid } = allocatePayments(sessions, payments);
  const lastPaymentBySession = new Map<string, Payment>();
  for (const payment of [...payments].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const id of payment.sessionIds) lastPaymentBySession.set(id, payment);
  }

  const totals = workbook.addWorksheet("TOTALES");
  const used = new Set<string>(["totales"]);
  const infos: PatientSheetInfo[] = [];

  const sorted = [...patients].sort((a, b) => a.name.localeCompare(b.name, "es"));
  for (const patient of sorted) {
    const own = sessions
      .filter((s) => s.patientId === patient.id && s.date.startsWith(`${year}-`))
      .sort((a, b) => a.date.localeCompare(b.date));
    if (own.length === 0) continue;
    const sheetName = safeSheetName(patient.name, used);
    const ws = workbook.addWorksheet(sheetName);
    const info = writePatientSheet(ws, year, own, sessionPaid, lastPaymentBySession);
    infos.push({ sheetName, ...info });
  }

  writeTotalsSheet(totals, year, infos);
  return workbook;
}

/** Genera el archivo .xlsx del año en el navegador. */
export async function exportYearToExcel(
  patients: Patient[],
  sessions: Session[],
  payments: Payment[],
  year: number
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = buildYearWorkbook(ExcelJS, patients, sessions, payments, year);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
