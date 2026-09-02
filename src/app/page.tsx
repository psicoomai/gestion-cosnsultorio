import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Alert } from "@/components/ui/Alert";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { formatCurrency } from "@/lib/format";
import { monthlyRevenue, patients, pendingBalance } from "@/lib/mock-data";

export default function DashboardPage() {
  const totalGenerated = patients.reduce((sum, p) => sum + p.totalGenerated, 0);
  const totalCollected = patients.reduce((sum, p) => sum + p.totalCollected, 0);
  const totalPending = patients.reduce((sum, p) => sum + pendingBalance(p), 0);
  const patientsWithDebt = patients
    .filter((p) => pendingBalance(p) > 0)
    .sort((a, b) => pendingBalance(b) - pendingBalance(a));

  return (
    <AppShell title="Panel" description="Resumen general del consultorio.">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Generado (6 meses)" value={formatCurrency(totalGenerated)} />
        <StatCard label="Cobrado (6 meses)" value={formatCurrency(totalCollected)} />
        <StatCard
          label="Pendiente de cobro"
          value={formatCurrency(totalPending)}
          tone={totalPending > 0 ? "debt" : "neutral"}
        />
        <StatCard label="Pacientes activos" value={String(patients.length)} />
      </div>

      {patientsWithDebt.length > 0 ? (
        <Alert variant="debt" title={`${patientsWithDebt.length} pacientes tienen saldo pendiente`} className="mt-6">
          Revisa la sección de Cobros para más detalle por paciente.
        </Alert>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Generado vs. cobrado</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={monthlyRevenue} />
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
                  {patientsWithDebt.map((patient) => (
                    <Tr key={patient.id}>
                      <Td>{patient.name}</Td>
                      <Td align="right" className="text-debt-red font-medium">
                        {formatCurrency(pendingBalance(patient))}
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
