"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { formatCurrency, formatDate } from "@/lib/format";
import { sessionPaidMap, sessionStatus } from "@/lib/metrics";

export default function SesionesPage() {
  const { patients, sessions, payments } = useClinicData();
  const paidMap = sessionPaidMap(sessions, payments);
  const patientById = new Map(patients.map((p) => [p.id, p]));
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
            {sorted.map((session) => {
              const patient = patientById.get(session.patientId);
              const paid = Math.min(paidMap.get(session.id) ?? 0, session.amount);
              const status = sessionStatus(session, paid);
              const currency = patient?.currency ?? "MXN";
              return (
                <Tr key={session.id}>
                  <Td className="pl-6 text-dark/70">{formatDate(session.date)}</Td>
                  <Td className="font-medium">{patient?.name ?? "—"}</Td>
                  <Td align="right">{formatCurrency(session.amount, currency)}</Td>
                  <Td align="right" className={paid < session.amount ? "text-debt-red" : undefined}>
                    {formatCurrency(paid, currency)}
                  </Td>
                  <Td className="pr-6">
                    <SessionStatusBadge status={status} />
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
