"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { ReconciliationCard } from "@/components/review/ReconciliationCard";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { unappliedTotal } from "@/lib/checks";
import { cn } from "@/lib/cn";
import { downloadBlob } from "@/lib/download";
import { formatCurrency } from "@/lib/format";
import { availableYears, yearSummary } from "@/lib/metrics";
import type { Currency } from "@/lib/types";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function amount(value: number, currency: Currency, emptyDash = true) {
  return Math.abs(value) < 0.005 && emptyDash ? "—" : formatCurrency(value, currency);
}

export default function TotalesPage() {
  const { patients, sessions, payments } = useClinicData();
  const years = useMemo(() => availableYears(sessions), [sessions]);
  const [year, setYear] = useState<number>(() => years[0] ?? new Date().getFullYear());
  const currencies = useMemo(() => [...new Set(patients.map((p) => p.currency))].sort(), [patients]);
  const [currency, setCurrency] = useState<Currency>("MXN");
  const activeCurrency = currencies.includes(currency) ? currency : (currencies[0] ?? "MXN");
  const [exporting, setExporting] = useState(false);

  const scopedPatients = useMemo(
    () => patients.filter((p) => p.currency === activeCurrency),
    [patients, activeCurrency]
  );
  const summary = useMemo(
    () => yearSummary(scopedPatients, sessions, payments, year),
    [scopedPatients, sessions, payments, year]
  );
  const unapplied = useMemo(() => unappliedTotal(sessions, payments), [sessions, payments]);
  const rows = summary.rows
    .filter((r) => r.total.generated > 0)
    .sort((a, b) => b.total.paid - a.total.paid);

  async function handleExport() {
    setExporting(true);
    try {
      const { exportYearToExcel } = await import("@/lib/export/excel-export");
      const blob = await exportYearToExcel(scopedPatients, sessions, payments, year);
      downloadBlob(blob, `Finanzas ${year}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell
      title="Corte anual"
      description="Real, cobrado y por cobrar del año, por mes y por paciente. Siempre cuadra: se calcula desde cada sesión."
      actions={
        <Button onClick={handleExport} disabled={exporting || rows.length === 0}>
          {exporting ? "Generando…" : "Descargar Excel"}
        </Button>
      }
    >
      <div className="mb-6 flex items-center gap-3">
        <Select
          value={String(year)}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-9 !w-32"
          aria-label="Año"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
        {currencies.length > 1 ? (
          <Select
            value={activeCurrency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="h-9 !w-32"
            aria-label="Moneda"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={`Sin sesiones en ${year}`}
          description="Registra sesiones o importa tu Excel para ver el corte del año."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Real (cobrado + por cobrar)"
              value={formatCurrency(summary.total.generated, activeCurrency)}
            />
            <StatCard label="Cobrado" value={formatCurrency(summary.total.paid, activeCurrency)} />
            <StatCard
              label="Por cobrar"
              value={formatCurrency(summary.total.pending, activeCurrency)}
              tone={summary.total.pending > 0.005 ? "debt" : "neutral"}
            />
          </div>

          <div className="grid grid-cols-10 gap-6">
            <Card className="col-span-6">
              <CardHeader>
                <CardTitle>Ingresos mensuales {year}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Mes</Th>
                      <Th align="right">Real</Th>
                      <Th align="right">Cobrado</Th>
                      <Th align="right">Por cobrar</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {summary.months.map((m, i) => (
                        <Tr key={i}>
                          <Td>{MONTHS[i]}</Td>
                          <Td align="right" className="text-dark/70">
                            {amount(m.generated, activeCurrency)}
                          </Td>
                          <Td align="right" className="text-blue-accent">
                            {amount(m.paid, activeCurrency)}
                          </Td>
                          <Td
                            align="right"
                            className={m.pending > 0.005 ? "font-medium text-debt-red" : "text-dark/40"}
                          >
                            {amount(m.pending, activeCurrency)}
                          </Td>
                        </Tr>
                    ))}
                  </Tbody>
                  <tfoot>
                    <Tr className="hover:bg-transparent">
                      <Td className="border-t-2 border-dark/25 font-serif text-base">Total</Td>
                      <Td align="right" className="border-t-2 border-dark/25 font-serif text-base">
                        {formatCurrency(summary.total.generated, activeCurrency)}
                      </Td>
                      <Td align="right" className="border-t-2 border-dark/25 font-serif text-base text-blue-accent">
                        {formatCurrency(summary.total.paid, activeCurrency)}
                      </Td>
                      <Td
                        align="right"
                        className={cn(
                          "border-t-2 border-dark/25 font-serif text-base",
                          summary.total.pending > 0.005 ? "text-debt-red" : "text-dark/40"
                        )}
                      >
                        {amount(summary.total.pending, activeCurrency)}
                      </Td>
                    </Tr>
                  </tfoot>
                </Table>
              </CardContent>
            </Card>
            <div className="col-span-4">
              <ReconciliationCard summary={summary} unapplied={unapplied} />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cobrado por paciente y mes</CardTitle>
              <p className="text-xs text-dark/50">Cada celda es lo cobrado de las sesiones de ese mes.</p>
            </CardHeader>
            <CardContent className="pt-0">
              <Table className="text-xs">
                <Thead>
                  <Tr>
                    <Th className="sticky left-0 bg-background">Paciente</Th>
                    {MONTHS.map((m) => (
                      <Th key={m} align="right">
                        {m.slice(0, 3)}
                      </Th>
                    ))}
                    <Th align="right">Cobrado</Th>
                    <Th align="right">Por cobrar</Th>
                    <Th align="right">Real</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((row) => (
                    <Tr key={row.patient.id}>
                      <Td className="sticky left-0 bg-background font-medium">
                        <Link href={`/pacientes/${row.patient.id}`} className="hover:text-blue-accent">
                          {row.patient.name}
                        </Link>
                      </Td>
                      {row.months.map((m, i) => (
                        <Td key={i} align="right" className={m.paid > 0 ? "text-dark" : "text-dark/30"}>
                          {amount(m.paid, activeCurrency)}
                        </Td>
                      ))}
                      <Td align="right" className="font-medium text-blue-accent">
                        {formatCurrency(row.total.paid, activeCurrency)}
                      </Td>
                      <Td
                        align="right"
                        className={row.total.pending > 0.005 ? "font-medium text-debt-red" : "text-dark/30"}
                      >
                        {amount(row.total.pending, activeCurrency)}
                      </Td>
                      <Td align="right">{formatCurrency(row.total.generated, activeCurrency)}</Td>
                    </Tr>
                  ))}
                </Tbody>
                <tfoot>
                  <Tr className="hover:bg-transparent">
                    <Td className="sticky left-0 border-t-2 border-dark/25 bg-background font-semibold">Total</Td>
                    {summary.months.map((m, i) => (
                      <Td key={i} align="right" className="border-t-2 border-dark/25 font-semibold">
                        {amount(m.paid, activeCurrency)}
                      </Td>
                    ))}
                    <Td align="right" className="border-t-2 border-dark/25 font-semibold text-blue-accent">
                      {formatCurrency(summary.total.paid, activeCurrency)}
                    </Td>
                    <Td
                      align="right"
                      className={cn(
                        "border-t-2 border-dark/25 font-semibold",
                        summary.total.pending > 0.005 ? "text-debt-red" : "text-dark/30"
                      )}
                    >
                      {amount(summary.total.pending, activeCurrency)}
                    </Td>
                    <Td align="right" className="border-t-2 border-dark/25 font-semibold">
                      {formatCurrency(summary.total.generated, activeCurrency)}
                    </Td>
                  </Tr>
                </tfoot>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
