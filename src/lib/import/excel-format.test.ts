import { describe, expect, it } from "vitest";
import { applyImport } from "@/lib/import/apply";
import { parseSpanishTextDate, parseWorkbook, toIsoDate, type RawCell, type RawSheet } from "@/lib/import/excel-format";
import { yearSummary } from "@/lib/metrics";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`); // así entrega ExcelJS las fechas
const HEADER: RawCell[] = [
  "Numero de sesión",
  "Fecha de sesión",
  "Costo de sesión",
  "Pagado",
  "Pendiente",
  "Total pagado",
  "Fecha de pago",
  "Total pendiente",
  "Total real",
  "Forma de pago",
  "Asistencia",
  "Mes",
  "Total",
];
// [n, fecha, costo, pagado, pendiente, F, fecha de pago, H, I, forma, asistencia, mes, total]
const row = (date: RawCell, paid: RawCell, pending: RawCell = null, paymentDate: RawCell = null, extra: RawCell[] = []) => [
  1,
  date,
  null,
  paid,
  pending,
  null,
  paymentDate,
  null,
  null,
  ...extra,
];

const patientSheet: RawSheet = {
  name: "Paciente Uno",
  rows: [
    HEADER,
    // La fila 2 trae además las fórmulas de totales del Excel: se ignoran.
    [1, d("2025-01-07"), 700, 700, null, 99999, d("2026-02-10"), 0, 99999, "quincenal", "si", "ENERO", 12345],
    row(d("2026-01-09"), 700),
    row("9 abirl 26", 700),
    row(d("2026-04-14"), 700, null, d("2024-08-10")),
    row(d("2026-04-21"), 700, null, d("2024-08-10")),
    row(null, 700),
    row(d("2026-05-05"), null, 700),
    row(d("2026-05-12"), "vacaciones", "vacaciones"),
    row(d("2026-05-19"), null, null),
  ],
};

const platformSheet: RawSheet = {
  name: "Plataforma de ejemplo",
  rows: [
    ["MES DONDE CORRESPONDE", "Fecha que recibí el pago", "BANCO A DONDE SE DEPOSITO", "Pagado", "Pendiente", "Total pagado", "Fecha de pago ", "Total pendiente"],
    ["MAYO", d("2026-05-28"), "BBVA", 6100, null, 16600, null, "PRIMERA QUINCENA DE MAYO"],
    ["MAYO", d("2026-06-15"), null, 5200, null, null, null, "SEGUNDA QUINCENA DE MAYO"],
    ["ABRIL", d("2026-05-14"), "BBVA", 5300, null, null, null, "AMBAS QUINCENAS DE ABRIL"],
    [null, null, null, 5300], // copia de una celda combinada D4:D5
    ["DICIEMBRE", d("2027-01-10"), null, 1000],
  ],
  mergedCopies: new Set(["4:3"]),
};

const ignoredSheets: RawSheet[] = [
  { name: "TOTALES", rows: [["REAL", "COBRADO"], [1, 2]] },
  { name: "PLANTILLA", rows: [HEADER] },
  { name: "Notas", rows: [["algo"]] },
];

describe("fechas", () => {
  it("lee fechas de Excel, números de serie y texto", () => {
    expect(toIsoDate(d("2026-07-14"))).toBe("2026-07-14");
    expect(toIsoDate(46217)).toBe("2026-07-14");
    expect(toIsoDate("14/07/2026")).toBe("2026-07-14");
    expect(parseSpanishTextDate("9 abirl 26")).toBe("2026-04-09");
    expect(parseSpanishTextDate("9 de abril", 2026)).toBe("2026-04-09");
    expect(parseSpanishTextDate("hola")).toBeNull();
  });
});

describe("parseWorkbook", () => {
  const preview = parseWorkbook([...ignoredSheets, patientSheet, platformSheet]);
  const uno = preview.patients.find((p) => p.name === "Paciente Uno")!;
  const plataforma = preview.patients.find((p) => p.kind === "plataforma")!;

  it("ignora TOTALES, PLANTILLA y hojas sin formato", () => {
    expect(preview.ignored.map((s) => s.name)).toEqual(["TOTALES", "PLANTILLA", "Notas"]);
  });

  it("suma exactamente las columnas Pagado y Pendiente, sin usar las fórmulas del Excel", () => {
    expect(uno.paid).toBe(700 * 6);
    expect(uno.pending).toBe(700);
    expect(uno.sessions).toHaveLength(7);
    expect(uno.rowsWithoutAmount).toBe(2); // "vacaciones" y la fila sin montos
  });

  it("señala y sugiere corregir años mal escritos", () => {
    const first = uno.sessions[0];
    expect(first.date).toBe("2025-01-07");
    expect(first.fixedDate).toBe("2026-01-07");
    const april = uno.sessions.find((s) => s.date === "2026-04-14")!;
    expect(april.fixedPaymentDate).toBe("2026-08-10");
    expect(uno.warnings.map((w) => w.kind)).toEqual(
      expect.arrayContaining(["anio-distinto", "fecha-texto", "fecha-pago-rara", "sin-fecha", "valor-no-numerico"])
    );
  });

  it("no pierde el monto de una fila sin fecha: usa la fecha de la fila anterior", () => {
    const noDate = uno.sessions.find((s) => s.row === 7)!;
    expect(noDate.date).toBe("2026-04-21");
  });

  it("lee hojas de plataforma por mes y no duplica celdas combinadas", () => {
    expect(plataforma.paid).toBe(6100 + 5200 + 5300 + 1000);
    expect(plataforma.sessions.map((s) => s.date)).toEqual(["2026-05-01", "2026-05-16", "2026-04-01", "2026-12-01"]);
  });
});

describe("applyImport", () => {
  const preview = parseWorkbook([patientSheet, platformSheet]);

  it("produce los mismos totales que el Excel y agrupa los pagos de la misma fecha", () => {
    const { data } = applyImport(preview.patients, { patients: [], sessions: [], payments: [] }, { fixDates: true });
    const y2026 = yearSummary(data.patients, data.sessions, data.payments, 2026);
    expect(y2026.total.paid).toBe(4200 + 6100 + 5200 + 5300 + 1000);
    expect(y2026.total.pending).toBe(700);
    const grouped = data.payments.find((p) => p.date === "2026-08-10")!;
    expect(grouped.sessionIds).toHaveLength(2);
    expect(grouped.amount).toBe(1400);
  });

  it("sin corrección, la sesión con año mal escrito queda en ese año", () => {
    const { data } = applyImport(preview.patients, { patients: [], sessions: [], payments: [] }, { fixDates: false });
    expect(data.sessions.some((s) => s.date === "2025-01-07")).toBe(true);
  });

  it("reimportar el mismo Excel no duplica nada", () => {
    const first = applyImport(preview.patients, { patients: [], sessions: [], payments: [] });
    const second = applyImport(preview.patients, first.data);
    expect(second.createdPatients).toBe(0);
    expect(second.createdSessions).toBe(0);
    expect(second.data.sessions).toHaveLength(first.data.sessions.length);
    expect(second.data.payments).toHaveLength(first.data.payments.length);
  });
});
