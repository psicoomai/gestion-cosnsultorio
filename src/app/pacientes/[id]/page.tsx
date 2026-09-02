"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PatientStatusBadge } from "@/components/ui/PatientStatusBadge";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import { Select } from "@/components/ui/Select";
import { StatCard } from "@/components/ui/StatCard";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { RegisterPaymentButton } from "@/components/payments/RegisterPaymentButton";
import { AttachReceiptButton } from "@/components/payments/AttachReceiptButton";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  currentMonthKey,
  monthLabel,
  patientMonths,
  patientPayments,
  patientSessions,
  patientTotals,
  sessionPaidMap,
  sessionStatus,
} from "@/lib/metrics";
import { paymentModalityLabels, sessionFrequencyLabels } from "@/lib/types";

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const { patients, sessions, payments } = useClinicData();
  const patient = patients.find((p) => p.id === params.id);

  const months = useMemo(() => patientMonths(params.id, sessions), [params.id, sessions]);
  const defaultMonth = months.includes(currentMonthKey()) ? currentMonthKey() : months[0];
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const month = selectedMonth ?? defaultMonth;

  if (!patient) {
    return (
      <AppShell title="Paciente no encontrado">
        <EmptyState
          title="No encontramos este paciente"
          description="Puede que haya sido eliminado o que el enlace sea incorrecto."
        />
        <Link href="/pacientes" className="mt-4 inline-block text-sm text-blue-accent">
          Volver a Pacientes
        </Link>
      </AppShell>
    );
  }

  const monthTotals = month ? patientTotals(patient.id, sessions, payments, month) : null;
  const historic = patientTotals(patient.id, sessions, payments);
  const paidMap = sessionPaidMap(sessions, payments.filter((p) => p.patientId === patient.id));
  const monthSessions = patientSessions(patient.id, sessions).filter(
    (s) => !month || s.date.slice(0, 7) === month
  );
  const allPayments = patientPayments(patient.id, payments);

  return (
    <AppShell
      title={patient.name}
      description={`Paciente desde ${formatDate(patient.startDate)}`}
      actions={<RegisterPaymentButton patientId={patient.id} />}
    >
      <Link href="/pacientes" className="mb-4 inline-block text-sm text-blue-accent">
        ← Volver a Pacientes
      </Link>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-md border border-dark/10 bg-background p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wideish text-dark/55">Estado</p>
          <div className="mt-2">
            <PatientStatusBadge status={patient.status} />
          </div>
        </div>
        <StatCard label="Frecuencia de sesiones" value={sessionFrequencyLabels[patient.sessionFrequency]} />
        <StatCard label="Modalidad de pago" value={paymentModalityLabels[patient.paymentModality]} />
        <StatCard
          label="Costo actual por sesión"
          value={formatCurrency(patient.costPerSession, patient.currency)}
        />
      </div>

      {patient.adminNotes ? (
        <Card className="mt-4">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-wideish text-dark/55">
              Notas administrativas
            </p>
            <p className="mt-1 text-sm text-dark/80">{patient.adminNotes}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-8 flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-dark">Resumen del mes</h2>
        {months.length > 0 ? (
          <Select
            value={month}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 w-52"
            aria-label="Mes seleccionado"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      {monthTotals ? (
        <div className="mt-3 grid grid-cols-5 gap-4">
          <StatCard label="Sesiones del mes" value={String(monthTotals.sessionsCount)} />
          <StatCard label="Honorarios" value={formatCurrency(monthTotals.generated, patient.currency)} />
          <StatCard label="Total pagado" value={formatCurrency(monthTotals.paid, patient.currency)} />
          <StatCard
            label="Total pendiente"
            value={formatCurrency(monthTotals.pending, patient.currency)}
            tone={monthTotals.pending > 0 ? "debt" : "neutral"}
          />
          <StatCard label="Total completo" value={formatCurrency(monthTotals.complete, patient.currency)} />
        </div>
      ) : (
        <EmptyState title="Sin sesiones registradas" description="Este paciente todavía no tiene sesiones." />
      )}

      <h2 className="mb-3 mt-8 font-serif text-lg text-dark">Histórico</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total pagado histórico" value={formatCurrency(historic.paid, patient.currency)} />
        <StatCard
          label="Total pendiente histórico"
          value={formatCurrency(historic.pending, patient.currency)}
          tone={historic.pending > 0 ? "debt" : "neutral"}
        />
        <StatCard
          label="Total completo histórico"
          value={formatCurrency(historic.complete, patient.currency)}
          hint="Pagado + pendiente"
        />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sesiones {month ? `· ${monthLabel(month)}` : ""}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {monthSessions.length === 0 ? (
              <p className="text-sm text-dark/60">Sin sesiones en este mes.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Fecha</Th>
                    <Th align="right">Monto</Th>
                    <Th align="right">Pagado</Th>
                    <Th>Estado</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {monthSessions.map((session) => {
                    const paid = Math.min(paidMap.get(session.id) ?? 0, session.amount);
                    return (
                      <Tr key={session.id}>
                        <Td className="text-dark/70">{formatDate(session.date)}</Td>
                        <Td align="right">{formatCurrency(session.amount, patient.currency)}</Td>
                        <Td align="right" className={paid < session.amount ? "text-debt-red" : undefined}>
                          {formatCurrency(paid, patient.currency)}
                        </Td>
                        <Td>
                          <SessionStatusBadge status={sessionStatus(session, paid)} />
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de pagos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {allPayments.length === 0 ? (
              <p className="text-sm text-dark/60">Sin pagos registrados.</p>
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>Fecha</Th>
                    <Th align="right">Monto</Th>
                    <Th>Referencia</Th>
                    <Th>Origen</Th>
                    <Th className="pr-6">Comprobante</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {allPayments.map((payment) => (
                    <Tr key={payment.id}>
                      <Td className="text-dark/70">{formatDate(payment.date)}</Td>
                      <Td align="right">{formatCurrency(payment.amount, patient.currency)}</Td>
                      <Td className="text-dark/70">{payment.reference || "—"}</Td>
                      <Td className="text-dark/70">
                        {payment.source === "comprobante" ? "Comprobante" : "Manual"}
                      </Td>
                      <Td className="pr-6">
                        <AttachReceiptButton payment={payment} />
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
