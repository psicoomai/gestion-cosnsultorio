"use client";

import { Fragment, useMemo, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { applyImport } from "@/lib/import/apply";
import { parseWorkbook, type ImportPreview } from "@/lib/import/excel-format";
import { readWorkbook } from "@/lib/import/read-workbook";

type Mode = "agregar" | "reemplazar";

export default function ImportarPage() {
  const data = useClinicData();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [fixDates, setFixDates] = useState(true);
  const [mode, setMode] = useState<Mode>("agregar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const hasExistingData = data.patients.length > 0;

  async function handleFile(file: File) {
    setError(null);
    setPreview(null);
    setFileName(file.name);
    if (!/\.xlsx$/i.test(file.name)) {
      setError("Sube un archivo de Excel en formato .xlsx (en Excel: Archivo → Guardar como → Libro de Excel).");
      return;
    }
    setLoading(true);
    try {
      const sheets = await readWorkbook(await file.arrayBuffer());
      const result = parseWorkbook(sheets);
      setPreview(result);
      // Por defecto se importan las hojas que tienen al menos una sesión.
      setSelected(new Set(result.patients.filter((p) => p.sessions.length > 0).map((p) => p.sheetName)));
      if (result.patients.length === 0) {
        setError(
          'No encontramos hojas de pacientes. Cada hoja debe tener en la fila 1 los encabezados "Fecha de sesión" y "Pagado".'
        );
      }
    } catch {
      setError("No se pudo leer el archivo. Verifica que sea un .xlsx válido y que no esté protegido con contraseña.");
    } finally {
      setLoading(false);
    }
  }

  const chosen = useMemo(
    () => preview?.patients.filter((p) => selected.has(p.sheetName)) ?? [],
    [preview, selected]
  );
  const chosenPaid = chosen.reduce((s, p) => s + p.paid, 0);
  const chosenPending = chosen.reduce((s, p) => s + p.pending, 0);
  const fixableCount = chosen.reduce((s, p) => s + p.warnings.filter((w) => w.fixable).length, 0);
  const warningCount = chosen.reduce((s, p) => s + p.warnings.length, 0);

  function toggle(set: Set<string>, key: string): Set<string> {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  function handleImport() {
    if (chosen.length === 0) return;
    const base = mode === "reemplazar" || !hasExistingData ? { patients: [], sessions: [], payments: [] } : data;
    const result = applyImport(chosen, base, { fixDates });
    data.replaceData(result.data);
    router.push("/totales");
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <AppShell
      title="Importar Excel"
      description="Trae tu Excel de pagos (una hoja por paciente). La app lee las filas y recalcula todos los totales."
    >
      <div className="flex max-w-6xl flex-col gap-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-blue-accent bg-blue-accent/[0.05]" : "border-dark/20 hover:border-dark/35"
          )}
        >
          <p className="font-serif text-lg text-dark">
            {loading ? "Leyendo tu Excel…" : fileName ? fileName : "Arrastra tu Excel aquí o haz clic para elegirlo"}
          </p>
          <p className="max-w-xl text-sm text-dark/60">
            Cada hoja = un paciente, con encabezados como &quot;Fecha de sesión&quot;, &quot;Pagado&quot;,
            &quot;Pendiente&quot; y &quot;Fecha de pago&quot;. Las hojas TOTALES y PLANTILLA se ignoran: sus
            fórmulas no se usan, todo se recalcula desde las filas. El archivo se lee en tu navegador y no se
            envía a ningún lado.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {error ? <Alert variant="accent" title={error} /> : null}

        {preview && preview.patients.length > 0 ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Vista previa</CardTitle>
                <p className="text-sm text-dark/60">
                  {chosen.length} de {preview.patients.length} hojas seleccionadas
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <Thead>
                    <Tr>
                      <Th className="w-8" />
                      <Th>Hoja / paciente</Th>
                      <Th align="right">Sesiones</Th>
                      <Th align="right">Cobrado</Th>
                      <Th align="right">Por cobrar</Th>
                      <Th>Avisos</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {preview.patients.map((p) => {
                      const isOpen = expanded.has(p.sheetName);
                      return (
                        <Fragment key={p.sheetName}>
                          <Tr>
                            <Td>
                              <Checkbox
                                aria-label={`Importar ${p.name}`}
                                checked={selected.has(p.sheetName)}
                                onChange={() => setSelected((s) => toggle(s, p.sheetName))}
                              />
                            </Td>
                            <Td className="font-medium">
                              {p.name}
                              {p.kind === "plataforma" ? (
                                <Badge variant="info" className="ml-2">
                                  Plataforma
                                </Badge>
                              ) : null}
                            </Td>
                            <Td align="right">{p.sessions.length}</Td>
                            <Td align="right">{formatCurrency(p.paid)}</Td>
                            <Td align="right" className={p.pending > 0 ? "text-debt-red" : "text-dark/40"}>
                              {p.pending > 0 ? formatCurrency(p.pending) : "—"}
                            </Td>
                            <Td>
                              {p.warnings.length > 0 ? (
                                <button
                                  type="button"
                                  className="text-sm text-orange-accent"
                                  onClick={() => setExpanded((s) => toggle(s, p.sheetName))}
                                >
                                  {p.warnings.length} {p.warnings.length === 1 ? "aviso" : "avisos"}{" "}
                                  {isOpen ? "▲" : "▼"}
                                </button>
                              ) : p.sessions.length === 0 ? (
                                <span className="text-sm text-dark/45">Sin sesiones con monto</span>
                              ) : (
                                <span className="text-sm text-dark/45">—</span>
                              )}
                            </Td>
                          </Tr>
                          {isOpen ? (
                            <Tr className="hover:bg-transparent">
                              <Td colSpan={6} className="whitespace-normal bg-dark/[0.025] !pl-10">
                                <ul className="flex flex-col gap-1 text-sm text-dark/75">
                                  {p.warnings.map((w, i) => (
                                    <li key={i}>• {w.message}</li>
                                  ))}
                                </ul>
                              </Td>
                            </Tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </Tbody>
                  <tfoot>
                    <Tr className="hover:bg-transparent">
                      <Td />
                      <Td className="border-t-2 border-dark/25 font-serif text-base">Total a importar</Td>
                      <Td align="right" className="border-t-2 border-dark/25 font-serif text-base">
                        {chosen.reduce((s, p) => s + p.sessions.length, 0)}
                      </Td>
                      <Td align="right" className="border-t-2 border-dark/25 font-serif text-base">
                        {formatCurrency(chosenPaid)}
                      </Td>
                      <Td align="right" className="border-t-2 border-dark/25 font-serif text-base text-debt-red">
                        {formatCurrency(chosenPending)}
                      </Td>
                      <Td className="border-t-2 border-dark/25" />
                    </Tr>
                  </tfoot>
                </Table>
                {preview.ignored.length > 0 ? (
                  <p className="mt-4 text-xs text-dark/50">
                    Hojas ignoradas: {preview.ignored.map((s) => `${s.name} (${s.reason})`).join(" · ")}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-4 pt-5 text-sm">
                <p className="text-dark/75">
                  El cobrado ({formatCurrency(chosenPaid)}) y el por cobrar ({formatCurrency(chosenPending)}) son la
                  suma directa de las columnas Pagado y Pendiente de las hojas seleccionadas: compáralos con tu hoja
                  de totales. Si no coinciden, a tu hoja de totales le falta o le sobra algo.
                </p>
                {warningCount > 0 ? (
                  <p className="text-dark/75">
                    Hay {warningCount} avisos: son filas que probablemente tienen un error de captura. Ábrelos para
                    verlos; después podrás corregir cualquier dato desde la ficha del paciente.
                  </p>
                ) : null}
                {fixableCount > 0 ? (
                  <label className="flex items-start gap-2">
                    <Checkbox checked={fixDates} onChange={(e) => setFixDates(e.target.checked)} className="mt-0.5" />
                    <span>
                      Corregir automáticamente {fixableCount} {fixableCount === 1 ? "fecha" : "fechas"} con el año mal
                      escrito (como se indica en los avisos). No cambia ningún monto, solo el mes o el año al que se
                      asignan.
                    </span>
                  </label>
                ) : null}
                {hasExistingData ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wideish text-dark/55">
                      Ya tienes datos en la app
                    </p>
                    <label className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="mode"
                        className="mt-1 accent-blue-accent"
                        checked={mode === "agregar"}
                        onChange={() => setMode("agregar")}
                      />
                      <span>
                        Agregar a lo que ya tengo, sin duplicar (los pacientes con el mismo nombre se juntan y se omiten
                        las sesiones que ya existen con la misma fecha y monto).
                      </span>
                    </label>
                    <label className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="mode"
                        className="mt-1 accent-blue-accent"
                        checked={mode === "reemplazar"}
                        onChange={() => setMode("reemplazar")}
                      />
                      <span>Reemplazar todos mis datos por los del Excel.</span>
                    </label>
                  </div>
                ) : null}
                <div>
                  <Button onClick={handleImport} disabled={chosen.length === 0}>
                    Importar {chosen.length} {chosen.length === 1 ? "paciente" : "pacientes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
