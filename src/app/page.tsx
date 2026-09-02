"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Alert } from "@/components/ui/Alert";
import { PatientStatusBadge } from "@/components/ui/PatientStatusBadge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AccountsReceivable } from "@/components/dashboard/AccountsReceivable";
import { AiQuery } from "@/components/dashboard/AiQuery";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import {
  allPatientsTotalsByCurrency,
  currentMonthKey,
  monthLabel,
  monthlyTotals,
  patientTotals,
} from "@/lib/metrics";

export default function DashboardPage() {
  const { patients, sessions, payments } = useClinicData();
  const router = useRouter();
  const month = currentMonthKey();

  const totalsByCurrency = allPatientsTotalsByCurrency(patients, sessions, payments, month);

  const patientRows = patients
    .map((patient) => ({ patient, month: patientTotals(patient.id, sessions, payments, month) }))
    .sort((a, b) => b.month.pending - a.month.pending);

  const patientsWithDebtCount = patients.filter(
    (p) => patientTotals(p.id, sessions, payments).pending > 0
  ).length;

  // La gráfica combina montos en una sola moneda operativa (MXN) para que las
  // barras sean comparables entre sí.
  const mxnPatientIds = new Set(patients.filter((p) => p.currency === "MXN").map((p) => p.id));
  const mxnSessions = sessions.filter((s) => mxnPatientIds.has(s.patientId));
  const revenueSeries = monthlyTotals(mxnSessions, payments, 6);
  const multiCurrency = Object.keys(totalsByCurrency).length > 1;
  const suffix = (currency: string) => (multiCurrency ? ` (${currency})` : "");

  return (
    <AppShell title="Panel" description={`Periodo: ${monthLabel(month)}`}>
      {/* 70% área principal / 30% panel lateral, como pide el layout de referencia. */}
      <div className="grid grid-cols-10 gap-6">
        <div className="col-span-7 flex flex-col gap-6">
          {Object.entries(totalsByCurrency).map(([currency, totals]) => (
            <div key={currency} className="grid grid-cols-4 gap-4">
              <StatCard
                label={`Honorarios del mes${suffix(currency)}`}
                value={formatCurrency(totals.generated, currency as "MXN" | "USD")}
              />
              <StatCard
                label={`Cobrado del mes${suffix(currency)}`}
                value={formatCurrency(totals.paid, currency as "MXN" | "USD")}
              />
              <StatCard
                label={`Pendiente del mes${suffix(currency)}`}
                value={formatCurrency(totals.pending, currency as "MXN" | "USD")}
                tone={totals.pending > 0 ? "debt" : "neutral"}
              />
              <StatCard label={`Sesiones del mes${suffix(currency)}`} value={String(totals.sessionsCount)} />
            </div>
          ))}

          {patientsWithDebtCount > 0 ? (
            <Alert variant="debt" title={`${patientsWithDebtCount} pacientes tienen saldo pendiente (histórico)`}>
              Revisa la sección de Cobros para más detalle por paciente.
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Honorarios vs. cobrado (MXN)</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={revenueSeries} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pacientes · {monthLabel(month)}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <Thead>
                  <Tr>
                    <Th className="pl-6">Paciente</Th>
                    <Th>Estado</Th>
                    <Th align="right">Honorarios</Th>
                    <Th align="right">Cobrado</Th>
                    <Th align="right" className="pr-6">
                      Pendiente
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {patientRows.map(({ patient, month: t }) => (
                    <Tr
                      key={patient.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/pacientes/${patient.id}`)}
                    >
                      <Td className="pl-6 font-medium">{patient.name}</Td>
                      <Td>
                        <PatientStatusBadge status={patient.status} />
                      </Td>
                      <Td align="right">{formatCurrency(t.generated, patient.currency)}</Td>
                      <Td align="right">{formatCurrency(t.paid, patient.currency)}</Td>
                      <Td
                        align="right"
                        className={cn("pr-6", t.pending > 0 ? "font-medium text-debt-red" : "text-dark/40")}
                      >
                        {t.pending > 0 ? formatCurrency(t.pending, patient.currency) : "—"}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral derecho — siempre estos tres bloques, en este orden. */}
        <div className="col-span-3 flex flex-col gap-6">
          <QuickActions />
          <AccountsReceivable />
          <AiQuery />
        </div>
      </div>
    </AppShell>
  );
}
