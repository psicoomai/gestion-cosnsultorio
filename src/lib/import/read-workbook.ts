// Convierte un archivo .xlsx en `RawSheet[]` usando ExcelJS. Se carga bajo
// demanda (import dinámico) para no engordar las demás pantallas.

import type { RawCell, RawSheet } from "@/lib/import/excel-format";

type ExcelValue = unknown;

/** Valor "visible" de una celda de ExcelJS: resultado de fórmula, texto enriquecido, etc. */
export function plainCellValue(value: ExcelValue): RawCell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if ("result" in v) return plainCellValue(v.result);
    if ("formula" in v || "sharedFormula" in v) return null;
    if (Array.isArray(v.richText)) {
      return (v.richText as { text?: string }[]).map((part) => part.text ?? "").join("");
    }
    if (typeof v.text === "string") return v.text;
    if ("error" in v) return null;
  }
  return null;
}

/** Recibe el contenido del archivo (ArrayBuffer) y devuelve sus hojas como filas de valores. */
export async function readWorkbook(buffer: ArrayBuffer): Promise<RawSheet[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheets: RawSheet[] = [];
  workbook.eachSheet((worksheet) => {
    const rows: RawCell[][] = [];
    const mergedCopies = new Set<string>();
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const cells: RawCell[] = [];
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        // ExcelJS repite el valor de una celda combinada en todas las filas
        // que abarca. Se marca para que los montos cuenten una sola vez.
        if (cell.isMerged && cell.master && cell.master.address !== cell.address) {
          mergedCopies.add(`${rowNumber - 1}:${colNumber - 1}`);
        }
        cells[colNumber - 1] = plainCellValue(cell.value);
      });
      rows[rowNumber - 1] = cells;
    });
    for (let i = 0; i < rows.length; i++) rows[i] = rows[i] ?? [];
    sheets.push({ name: worksheet.name, rows, mergedCopies });
  });
  return sheets;
}
