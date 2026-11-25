import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildYearWorkbook, safeSheetName, sheetRef } from "@/lib/export/excel-export";
import type { Patient, Payment, Session } from "@/lib/types";

const patient = (id: string, name: string): Patient => ({
  id,
  name,
  startDate: "2026-01-01",
  status: "activo",
  sessionFrequency: "semanal-1",
  paymentModality: "por-sesion",
  costPerSession: 600,
  currency: "MXN",
});

describe("nombres de hoja", () => {
  it("limpia caracteres inválidos, recorta a 31 y evita repetidos", () => {
    const used = new Set<string>(["totales"]);
    expect(safeSheetName("Ana/López [SH]", used)).toBe("Ana López SH");
    expect(safeSheetName("Un nombre larguísimo de paciente que no cabe", used)).toHaveLength(31);
    expect(safeSheetName("Ana López SH", used)).toBe("Ana López SH (2)");
    expect(safeSheetName("Totales", used)).toBe("Paciente Totales");
  });

  it("escapa comillas simples en referencias", () => {
    expect(sheetRef("D'Angelo", "F2")).toBe("'D''Angelo'!F2");
  });
});

describe("buildYearWorkbook", () => {
  const patients = [patient("a", "Paciente A"), patient("b", "Paciente B"), patient("c", "Sin sesiones")];
  const sessions: Session[] = [
    { id: "1", patientId: "a", date: "2026-07-28", amount: 600 },
    { id: "2", patientId: "a", date: "2026-08-04", amount: 600 },
    { id: "3", patientId: "b", date: "2026-08-11", amount: 1000 },
    { id: "4", patientId: "b", date: "2025-12-01", amount: 1000 },
  ];
  const payments: Payment[] = [
    { id: "p", patientId: "a", amount: 1200, date: "2026-08-05", sessionIds: ["1", "2"], source: "manual", createdAt: "x" },
  ];
  const wb = buildYearWorkbook(ExcelJS, patients, sessions, payments, 2026);
  const totals = wb.getWorksheet("TOTALES")!;
  const result = (cell: string) => totals.getCell(cell).result as number;

  it("crea TOTALES y una hoja por paciente con sesiones en el año", () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual(["TOTALES", "Paciente A", "Paciente B"]);
  });

  it("COBRADO, POR COBRAR y los meses salen de la tabla paciente × mes", () => {
    expect(result("B2")).toBe(1200);
    expect(result("C2")).toBe(1000);
    expect(result("A2")).toBe(2200);
    expect(result("F8")).toBe(600); // julio
    expect(result("F9")).toBe(600); // agosto
    expect(result("G9")).toBe(1000);
    expect(result("F17")).toBe(0); // DIFERENCIA
  });

  it("en cada hoja, el mes se calcula por fecha (SUMIFS), no por rangos de filas", () => {
    const sheet = wb.getWorksheet("Paciente A")!;
    const july = sheet.getCell("M8").value as { formula: string };
    expect(july.formula).toBe('SUMIFS($D:$D,$B:$B,">="&DATE(2026,7,1),$B:$B,"<"&DATE(2026,8,1))');
    expect((sheet.getCell("F2").value as { formula: string }).formula).toBe("SUM(D:D)");
  });
});
