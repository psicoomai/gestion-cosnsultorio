import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/format";
import { patients, pendingBalance } from "@/lib/mock-data";

export default function PacientesPage() {
  return (
    <AppShell title="Pacientes" description="Directorio de pacientes activos.">
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th className="pl-6">Paciente</Th>
              <Th>Contacto</Th>
              <Th align="right">Sesiones</Th>
              <Th align="right">Generado</Th>
              <Th align="right">Cobrado</Th>
              <Th align="right" className="pr-6">
                Saldo
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {patients.map((patient) => {
              const balance = pendingBalance(patient);
              return (
                <Tr key={patient.id}>
                  <Td className="pl-6">
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-xs text-dark/50">
                      Paciente desde {formatDate(patient.activeSince)}
                    </p>
                  </Td>
                  <Td>
                    <p className="text-dark/80">{patient.email}</p>
                    <p className="text-xs text-dark/50">{patient.phone}</p>
                  </Td>
                  <Td align="right">{patient.sessionsCount}</Td>
                  <Td align="right">{formatCurrency(patient.totalGenerated)}</Td>
                  <Td align="right">{formatCurrency(patient.totalCollected)}</Td>
                  <Td align="right" className="pr-6">
                    {balance > 0 ? (
                      <Badge variant="debt">{formatCurrency(balance)}</Badge>
                    ) : (
                      <Badge variant="neutral">Al corriente</Badge>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Card>
    </AppShell>
  );
}
