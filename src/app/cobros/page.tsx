"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { RegisterPaymentButton } from "@/components/payments/RegisterPaymentButton";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import {
  allPatientsTotalsByCurrency,
  currentMonthKey,
  monthKey,
  monthLabel,
  patientTotals,
} from "@/lib/metrics";

export default function CobrosPage() {
  const { patients, sessions, payments } = useClinicData();

  const months = useMemo(() => {
    const keys = new Set(sessions.map((s) => monthKey(s.date)));
    keys.add(currentMonthKey());
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [sessions]);

  const [month, setMonth] = useState(currentMonthKey());

  const rows = patients.map((patient) => ({
    patient,
    totals: patientTotals(patient.id, sessions, payments, month),
  }));

  // Un total por moneda: sumar MXN y USD en una sola cifra sería incorrecto.
  const totalsByCurrency = allPatientsTotalsByCurrency(patients, sessions, payments, month);

  return (
    <AppShell
      title="Cobros"
      description="Honorarios, cobrado y pendiente, por paciente."
      actions={<RegisterPaymentButton />}
    >
      <Card>
        <CardHeader>
          <CardTitle>Corte del periodo</CardTitle>
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-52">
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <Thead>
              <Tr>
                <Th className="pl-6">Paciente</Th>
                <Th align="right">Honorarios</Th>
                <Th align="right">Cobrado</Th>
                <Th align="right" className="pr-6">
                  Pendiente
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map(({ patient, totals: t }) => (
                <Tr key={patient.id}>
                  <Td className="pl-6 font-medium">{patient.name}</Td>
                  <Td align="right" className="text-dark/80">
                    {formatCurrency(t.generated, patient.currency)}
                  </Td>
                  <Td align="right" className="text-blue-accent">
                    {formatCurrency(t.paid, patient.currency)}
                  </Td>
                  <Td
                    align="right"
                    className={cn("pr-6", t.pending > 0 ? "font-medium text-debt-red" : "text-dark/40")}
                  >
                    {t.pending > 0 ? formatCurrency(t.pending, patient.currency) : "—"}
                  </Td>
                </Tr>
              ))}
            </Tbody>
            <tfoot>
              {Object.entries(totalsByCurrency).map(([currency, t]) => (
                <Tr key={currency} className="hover:bg-transparent">
                  <Td className="border-t-2 border-dark/25 pl-6 font-serif text-base">
                    Total {Object.keys(totalsByCurrency).length > 1 ? `(${currency})` : ""}
                  </Td>
                  <Td align="right" className="border-t-2 border-dark/25 font-serif text-base">
                    {formatCurrency(t.generated, currency as "MXN" | "USD")}
                  </Td>
                  <Td align="right" className="border-t-2 border-dark/25 font-serif text-base text-blue-accent">
                    {formatCurrency(t.paid, currency as "MXN" | "USD")}
                  </Td>
                  <Td
                    align="right"
                    className={cn(
                      "border-t-2 border-dark/25 pr-6 font-serif text-base",
                      t.pending > 0 ? "text-debt-red" : "text-dark/40"
                    )}
                  >
                    {t.pending > 0 ? formatCurrency(t.pending, currency as "MXN" | "USD") : "—"}
                  </Td>
                </Tr>
              ))}
            </tfoot>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
