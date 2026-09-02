import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/format";
import { sessions } from "@/lib/mock-data";

export default function SesionesPage() {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppShell title="Sesiones" description="Historial de sesiones y su estado de pago.">
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th className="pl-6">Fecha</Th>
              <Th>Paciente</Th>
              <Th align="right">Monto</Th>
              <Th align="right">Pagado</Th>
              <Th className="pr-6">Estado</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sorted.map((session) => (
              <Tr key={session.id}>
                <Td className="pl-6 text-dark/70">{formatDate(session.date)}</Td>
                <Td className="font-medium">{session.patientName}</Td>
                <Td align="right">{formatCurrency(session.amount)}</Td>
                <Td
                  align="right"
                  className={session.paidAmount < session.amount ? "text-debt-red" : undefined}
                >
                  {formatCurrency(session.paidAmount)}
                </Td>
                <Td className="pr-6">
                  <SessionStatusBadge status={session.status} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </AppShell>
  );
}
