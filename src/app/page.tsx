"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Alert } from "@/components/ui/Alert";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { formatCurrency } from "@/lib/format";
import { allPatientsTotalsByCurrency, currentMonthKey, monthLabel, monthlyTotals, patientTotals } from "@/lib/metrics";

export default function DashboardPage() {
  const { patients, sessions, payments } = useClinicData();
  const month = currentMonthKey();

  const totalsByCurrency = allPatientsTotalsByCurrency(patients, sessions, payments, month);

  const patientsWithDebt = patients
    .map((patient) => ({ patient, historic: patientTotals(patient.id, sessions, payments) }))
    .filter(({ historic }) => historic.pending > 0)
    .sort((a, b) => b.historic.pending - a.historic.pending);

  // La gráfica combina montos en una sola moneda operativa (MXN) para que las
  // barras sean comparables entre sí.
  const mxnPatientIds = new Set(patients.filter((p) => p.currency === "MXN").map((p) => p.id));
  const mxnSessions = sessions.filter((s) => mxnPatientIds.has(s.patientId));
  const revenueSeries = monthlyTotals(mxnSessions, payments, 6);

  return (
    <AppShell title="Panel" description={`Resumen general del consultorio · ${monthLabel(month)}.`}>
      {Object.entries(totalsByCurrency).map(([currency, totals]) => (
        <div key={currency} className="grid grid-cols-4 gap-4">
          <StatCard
            label={`Generado del mes (${currency})`}
            value={formatCurrency(totals.generated, currency as "MXN" | "USD")}
          />
          <StatCard
            label={`Cobrado del mes (${currency})`}
            value={formatCurrency(totals.paid, currency as "MXN" | "USD")}
          />
          <StatCard
            label={`Pendiente del mes (${currency})`}
            value={formatCurrency(totals.pending, currency as "MXN" | "USD")}
            tone={totals.pending > 0 ? "debt" : "neutral"}
          />
          <StatCard label={`Sesiones del mes (${currency})`} value={String(totals.sessionsCount)} />
        </div>
      ))}

      {patientsWithDebt.length > 0 ? (
        <Alert
          variant="debt"
          title={`${patientsWithDebt.length} pacientes tienen saldo pendiente (histórico)`}
          className="mt-6"
        >
          Revisa la sección de Cobros para más detalle por paciente.
        </Alert>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Generado vs. cobrado (MXN)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo pendiente por paciente</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {patientsWithDebt.length === 0 ? (
              <p className="text-sm text-dark/60">No hay adeudos pendientes.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Paciente</Th>
                    <Th align="right">Adeudo</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {patientsWithDebt.map(({ patient, historic }) => (
                    <Tr key={patient.id}>
                      <Td>{patient.name}</Td>
                      <Td align="right" className="font-medium text-debt-red">
                        {formatCurrency(historic.pending, patient.currency)}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
