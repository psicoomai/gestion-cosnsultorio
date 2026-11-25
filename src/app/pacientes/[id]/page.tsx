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
import { Alert } from "@/components/ui/Alert";
import { RegisterPaymentButton } from "@/components/payments/RegisterPaymentButton";
import { AttachReceiptButton } from "@/components/payments/AttachReceiptButton";
import { EditPaymentModal } from "@/components/payments/EditPaymentModal";
import { EditPatientButton } from "@/components/patients/EditPatientButton";
import { ScheduleCard } from "@/components/patients/ScheduleCard";
import { TreatmentCard } from "@/components/patients/TreatmentCard";
import { EditSessionModal } from "@/components/sessions/EditSessionModal";
import { NewSessionButton } from "@/components/sessions/NewSessionButton";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { runChecks } from "@/lib/checks";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  allocatePayments,
  currentMonthKey,
  monthLabel,
  patientMonths,
  patientPayments,
  patientSessions,
  patientTotals,
  sessionStatus,
  yearSummary,
} from "@/lib/metrics";
import { paymentModalityLabels, sessionFrequencyLabels, type Payment, type Session } from "@/lib/types";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const { patients, sessions, payments } = useClinicData();
  const patient = patients.find((p) => p.id === params.id);

  const months = useMemo(() => patientMonths(params.id, sessions), [params.id, sessions]);
  const defaultMonth = months.includes(currentMonthKey()) ? currentMonthKey() : months[0];
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const month = selectedMonth ?? defaultMonth;
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const issues = useMemo(
    () => runChecks(patients, sessions, payments).filter((i) => i.patientId === params.id),
    [patients, sessions, payments, params.id]
  );
  const year = Number((month ?? currentMonthKey()).slice(0, 4));
  const yearRow = useMemo(() => {
    const p = patients.find((pp) => pp.id === params.id);
    return p ? yearSummary([p], sessions, payments, year).rows[0] : null;
  }, [patients, sessions, payments, params.id, year]);

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
  const allocation = allocatePayments(
    sessions.filter((s) => s.patientId === patient.id),
    payments.filter((p) => p.patientId === patient.id)
  );
  const paidMap = allocation.sessionPaid;
  const monthSessions = patientSessions(patient.id, sessions).filter(
    (s) => !month || s.date.slice(0, 7) === month
  );
  const allPayments = patientPayments(patient.id, payments);

  return (
    <AppShell
      title={patient.name}
      description={
        patient.endDate
          ? `En tratamiento del ${formatDate(patient.startDate)} al ${formatDate(patient.endDate)}`
          : `Paciente desde ${formatDate(patient.startDate)}`
      }
      actions={
        <>
          <EditPatientButton patient={patient} />
          <NewSessionButton patientId={patient.id} variant="secondary">
            Registrar sesiones
          </NewSessionButton>
          <RegisterPaymentButton patientId={patient.id} />
        </>
      }
    >
      <Link href="/pacientes" className="mb-4 inline-block text-sm text-blue-accent">
        ← Volver a Pacientes
      </Link>

      {issues.length > 0 ? (
        <div className="mb-6 flex flex-col gap-2">
          {issues.map((issue) => (
            <Alert
              key={issue.id}
              variant={issue.severity === "adeudo" ? "debt" : issue.severity === "atencion" ? "accent" : "info"}
              title={issue.title.replace(`${patient.name}: `, "")}
            >
              {issue.detail}
            </Alert>
          ))}
        </div>
      ) : null}

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

      <div className="mt-4 grid grid-cols-2 gap-4">
        <TreatmentCard patient={patient} />
        <ScheduleCard patient={patient} />
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
            className="h-9 !w-52"
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
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {monthSessions.map((session) => {
                    const paid = Math.min(paidMap.get(session.id) ?? 0, session.amount);
                    return (
                      <Tr key={session.id}>
                        <Td className="text-dark/70">
                          {formatDate(session.date)}
                          {session.note ? <span className="block text-xs text-dark/45">{session.note}</span> : null}
                        </Td>
                        <Td align="right">{formatCurrency(session.amount, patient.currency)}</Td>
                        <Td align="right" className={paid < session.amount ? "text-debt-red" : undefined}>
                          {formatCurrency(paid, patient.currency)}
                        </Td>
                        <Td>
                          <SessionStatusBadge status={sessionStatus(session, paid)} />
                        </Td>
                        <Td align="right">
                          <button
                            type="button"
                            className="text-xs text-blue-accent"
                            onClick={() => setEditingSession(session)}
                          >
                            Editar
                          </button>
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
                    <Th>Comprobante</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {allPayments.map((payment) => (
                    <Tr key={payment.id}>
                      <Td className="text-dark/70">{formatDate(payment.date)}</Td>
                      <Td align="right">
                        {formatCurrency(payment.amount, patient.currency)}
                        {payment.amount - (allocation.paymentApplied.get(payment.id) ?? 0) > 0.009 ? (
                          <span className="block text-xs text-orange-accent">
                            {formatCurrency(
                              payment.amount - (allocation.paymentApplied.get(payment.id) ?? 0),
                              patient.currency
                            )}{" "}
                            sin aplicar
                          </span>
                        ) : null}
                      </Td>
                      <Td className="text-dark/70">{payment.reference || "—"}</Td>
                      <Td className="text-dark/70">
                        {payment.source === "comprobante"
                          ? "Comprobante"
                          : payment.source === "importado"
                            ? "Excel"
                            : "Manual"}
                      </Td>
                      <Td>
                        <AttachReceiptButton payment={payment} />
                      </Td>
                      <Td align="right">
                        <button
                          type="button"
                          className="text-xs text-blue-accent"
                          onClick={() => setEditingPayment(payment)}
                        >
                          Editar
                        </button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {yearRow ? (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Por mes · {year}</CardTitle>
            <p className="text-xs text-dark/50">Cada sesión cuenta en el mes de su fecha.</p>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Mes</Th>
                  <Th align="right">Real</Th>
                  <Th align="right">Cobrado</Th>
                  <Th align="right">Pendiente</Th>
                </Tr>
              </Thead>
              <Tbody>
                {yearRow.months.map((m, i) =>
                  m.generated === 0 ? null : (
                    <Tr key={i}>
                      <Td>{MONTH_NAMES[i]}</Td>
                      <Td align="right">{formatCurrency(m.generated, patient.currency)}</Td>
                      <Td align="right" className="text-blue-accent">
                        {formatCurrency(m.paid, patient.currency)}
                      </Td>
                      <Td align="right" className={cn(m.pending > 0.005 ? "text-debt-red" : "text-dark/40")}>
                        {m.pending > 0.005 ? formatCurrency(m.pending, patient.currency) : "—"}
                      </Td>
                    </Tr>
                  )
                )}
              </Tbody>
              <tfoot>
                <Tr className="hover:bg-transparent">
                  <Td className="border-t-2 border-dark/25 font-serif text-base">Total {year}</Td>
                  <Td align="right" className="border-t-2 border-dark/25 font-serif text-base">
                    {formatCurrency(yearRow.total.generated, patient.currency)}
                  </Td>
                  <Td align="right" className="border-t-2 border-dark/25 font-serif text-base text-blue-accent">
                    {formatCurrency(yearRow.total.paid, patient.currency)}
                  </Td>
                  <Td
                    align="right"
                    className={cn(
                      "border-t-2 border-dark/25 font-serif text-base",
                      yearRow.total.pending > 0.005 ? "text-debt-red" : "text-dark/40"
                    )}
                  >
                    {yearRow.total.pending > 0.005 ? formatCurrency(yearRow.total.pending, patient.currency) : "—"}
                  </Td>
                </Tr>
              </tfoot>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <EditSessionModal session={editingSession} onClose={() => setEditingSession(null)} />
      <EditPaymentModal
        payment={editingPayment}
        currency={patient.currency}
        onClose={() => setEditingPayment(null)}
      />
    </AppShell>
  );
}
