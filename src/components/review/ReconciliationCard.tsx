"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/format";
import type { YearSummary } from "@/lib/metrics";

/**
 * Equivalente a la celda "DIFERENCIA" del Excel: muestra que el cobrado
 * sumado por pacientes, por meses y directo da exactamente lo mismo.
 */
export function ReconciliationCard({
  summary,
  receivedInYear,
  unapplied,
}: {
  summary: YearSummary;
  /** Suma de todos los pagos aplicados a sesiones del año. */
  receivedInYear?: number;
  /** Dinero recibido que no está aplicado a ninguna sesión (todos los años). */
  unapplied: number;
}) {
  const { byPatients, byMonths, direct, ok } = summary.reconciliation;
  const rows: [string, number][] = [
    ["Suma de los pacientes", byPatients],
    ["Suma de los meses", byMonths],
    ["Suma directa de las sesiones", direct],
  ];
  if (receivedInYear !== undefined) rows.push(["Pagos aplicados a sesiones del año", receivedInYear]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuadre {summary.year}</CardTitle>
        <Badge variant={ok ? "info" : "accent"}>{ok ? "Cuadra" : "No cuadra"}</Badge>
      </CardHeader>
      <CardContent className="pt-0 text-sm">
        <dl className="divide-y divide-dark/10">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between py-2">
              <dt className="text-dark/65">{label}</dt>
              <dd className="tabular-nums">{formatCurrency(value)}</dd>
            </div>
          ))}
          <div className="flex justify-between py-2">
            <dt className="text-dark/65">Diferencia</dt>
            <dd className="font-medium tabular-nums">{formatCurrency(byPatients - byMonths)}</dd>
          </div>
        </dl>
        {unapplied > 0 ? (
          <p className="mt-3 text-xs text-orange-accent">
            Además hay {formatCurrency(unapplied)} recibidos que no están aplicados a ninguna sesión y por eso no
            aparecen en Cobrado. Revisa la sección &quot;Dinero que no entra en Cobrado&quot;.
          </p>
        ) : (
          <p className="mt-3 text-xs text-dark/50">Todo el dinero recibido está aplicado a sesiones.</p>
        )}
      </CardContent>
    </Card>
  );
}
