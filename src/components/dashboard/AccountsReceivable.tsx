"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { formatCurrency } from "@/lib/format";
import { allPatientsTotalsByCurrency } from "@/lib/metrics";

/**
 * Total pendiente global — siempre calculado desde sesiones y pagos reales
 * (src/lib/metrics.ts), nunca un valor fijo en el código. Por moneda: sumar
 * MXN y USD en una sola cifra sería incorrecto.
 */
export function AccountsReceivable() {
  const { patients, sessions, payments } = useClinicData();
  const totalsByCurrency = allPatientsTotalsByCurrency(patients, sessions, payments);
  const entries = Object.entries(totalsByCurrency).filter(([, t]) => t.pending > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuentas por cobrar</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs font-semibold uppercase tracking-wideish text-dark/55">
          Total pendiente global
        </p>
        {entries.length === 0 ? (
          <p className="mt-2 font-serif text-2xl text-dark">Sin adeudos</p>
        ) : (
          <div className="mt-2 flex flex-col gap-0.5">
            {entries.map(([currency, t]) => (
              <p key={currency} className="font-serif text-2xl text-debt-red">
                {formatCurrency(t.pending, currency as "MXN" | "USD")}
              </p>
            ))}
          </div>
        )}
        <Link href="/cobros" className="mt-3 inline-block text-xs text-blue-accent">
          Ver detalle en Cobros →
        </Link>
      </CardContent>
    </Card>
  );
}
