import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { patients, pendingBalance } from "@/lib/mock-data";

export default function CobrosPage() {
  const rows = patients.map((patient) => ({
    patient,
    generado: patient.totalGenerated,
    cobrado: patient.totalCollected,
    pendiente: pendingBalance(patient),
  }));

  const totals = rows.reduce(
    (acc, row) => ({
      generado: acc.generado + row.generado,
      cobrado: acc.cobrado + row.cobrado,
      pendiente: acc.pendiente + row.pendiente,
    }),
    { generado: 0, cobrado: 0, pendiente: 0 }
  );

  return (
    <AppShell
      title="Cobros"
      description="Lo generado, lo cobrado y lo pendiente, por paciente."
    >
      <Card>
        <CardHeader>
          <CardTitle>Corte del periodo</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <Thead>
              <Tr>
                <Th className="pl-6">Paciente</Th>
                <Th align="right">Generado</Th>
                <Th align="right">Cobrado</Th>
                <Th align="right" className="pr-6">
                  Pendiente
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map(({ patient, generado, cobrado, pendiente }) => (
                <Tr key={patient.id}>
                  <Td className="pl-6 font-medium">{patient.name}</Td>
                  <Td align="right" className="text-dark/80">
                    {formatCurrency(generado)}
                  </Td>
                  <Td align="right" className="text-blue-accent">
                    {formatCurrency(cobrado)}
                  </Td>
                  <Td
                    align="right"
                    className={cn("pr-6", pendiente > 0 ? "font-medium text-debt-red" : "text-dark/40")}
                  >
                    {pendiente > 0 ? formatCurrency(pendiente) : "—"}
                  </Td>
                </Tr>
              ))}
            </Tbody>
            <tfoot>
              <Tr className="hover:bg-transparent">
                <Td className="pl-6 border-t-2 border-dark/25 font-serif text-base">Total</Td>
                <Td align="right" className="border-t-2 border-dark/25 font-serif text-base">
                  {formatCurrency(totals.generado)}
                </Td>
                <Td
                  align="right"
                  className="border-t-2 border-dark/25 font-serif text-base text-blue-accent"
                >
                  {formatCurrency(totals.cobrado)}
                </Td>
                <Td
                  align="right"
                  className={cn(
                    "pr-6 border-t-2 border-dark/25 font-serif text-base",
                    totals.pendiente > 0 ? "text-debt-red" : "text-dark/40"
                  )}
                >
                  {totals.pendiente > 0 ? formatCurrency(totals.pendiente) : "—"}
                </Td>
              </Tr>
            </tfoot>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
