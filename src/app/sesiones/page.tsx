"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import { AttendanceBadge } from "@/components/ui/AttendanceBadge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { EditSessionModal } from "@/components/sessions/EditSessionModal";
import { NewSessionButton } from "@/components/sessions/NewSessionButton";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentMonthKey, monthKey, monthLabel, sessionPaidMap, sessionStatus } from "@/lib/metrics";
import type { Session } from "@/lib/types";

const ALL = "todos";

export default function SesionesPage() {
  const { patients, sessions, payments } = useClinicData();
  const [editing, setEditing] = useState<Session | null>(null);
  const months = useMemo(() => {
    const keys = new Set(sessions.map((s) => monthKey(s.date)));
    keys.add(currentMonthKey());
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [sessions]);
  const [month, setMonth] = useState<string>(currentMonthKey());

  const paidMap = useMemo(() => sessionPaidMap(sessions, payments), [sessions, payments]);
  const patientById = new Map(patients.map((p) => [p.id, p]));
  const sorted = sessions
    .filter((s) => month === ALL || monthKey(s.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppShell
      title="Sesiones"
      description="Historial de sesiones y su estado de pago."
      actions={<NewSessionButton>Registrar sesiones</NewSessionButton>}
    >
      <div className="mb-4">
        <Select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 !w-56" aria-label="Mes">
          <option value={ALL}>Todos los meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title="Sin sesiones en este periodo" description="Usa “Registrar sesiones” para agregar una o varias." />
      ) : (
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th className="pl-6">Fecha</Th>
                <Th>Paciente</Th>
                <Th align="right">Monto</Th>
                <Th align="right">Pagado</Th>
                <Th>Estado</Th>
                <Th className="pr-6" />
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
                    <Td className="pl-6 text-dark/70">
                      {formatDate(session.date)}
                      {session.note ? <span className="block text-xs text-dark/45">{session.note}</span> : null}
                    </Td>
                    <Td className="font-medium">
                      {patient ? (
                        <Link href={`/pacientes/${patient.id}`} className="hover:text-blue-accent">
                          {patient.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td align="right">{formatCurrency(session.amount, currency)}</Td>
                    <Td align="right" className={paid < session.amount ? "text-debt-red" : undefined}>
                      {formatCurrency(paid, currency)}
                    </Td>
                    <Td>
                      {session.amount > 0 ? <SessionStatusBadge status={status} /> : null}
                      <AttendanceBadge session={session} />
                    </Td>
                    <Td align="right" className="pr-6">
                      <button type="button" className="text-xs text-blue-accent" onClick={() => setEditing(session)}>
                        Editar
                      </button>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Card>
      )}
      <EditSessionModal session={editing} onClose={() => setEditing(null)} />
    </AppShell>
  );
}
