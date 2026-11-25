"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PatientStatusBadge } from "@/components/ui/PatientStatusBadge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { AddPatientButton } from "@/components/patients/AddPatientButton";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { buildIcs, describeSchedule } from "@/lib/calendar";
import { cn } from "@/lib/cn";
import { downloadBlob } from "@/lib/download";
import { formatCurrency, formatDate, todayIso } from "@/lib/format";
import { currentMonthKey, monthLabel, patientTotals } from "@/lib/metrics";
import { endTreatmentPatch, isCurrentlyActive, lastSessionDate } from "@/lib/treatment";
import { paymentModalityLabels } from "@/lib/types";

type Filter = "activos" | "inactivos" | "todos";
const INACTIVITY_DAYS = 60;

export default function PacientesPage() {
  const { patients, sessions, payments, updatePatient } = useClinicData();
  const router = useRouter();
  const month = currentMonthKey();
  const [filter, setFilter] = useState<Filter>("activos");

  const activeCount = patients.filter(isCurrentlyActive).length;
  const visible = patients
    .filter((p) => (filter === "todos" ? true : filter === "activos" ? isCurrentlyActive(p) : !isCurrentlyActive(p)))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  // Activos sin sesiones en los últimos 60 días: probablemente ya no vienen.
  const stale = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() - INACTIVITY_DAYS);
    const limitIso = todayIso(limit);
    return patients
      .filter(isCurrentlyActive)
      .map((p) => ({ patient: p, last: lastSessionDate(p.id, sessions) }))
      .filter(({ patient, last }) => (last ? last < limitIso : patient.startDate < limitIso));
  }, [patients, sessions]);

  const withSchedule = patients.filter((p) => isCurrentlyActive(p) && (p.schedule?.length ?? 0) > 0);

  function markStaleAsInactive() {
    for (const { patient, last } of stale) {
      updatePatient(patient.id, endTreatmentPatch(last ?? patient.startDate));
    }
  }

  function downloadCalendar() {
    const ics = buildIcs(withSchedule, Intl.DateTimeFormat().resolvedOptions().timeZone);
    downloadBlob(new Blob([ics], { type: "text/calendar;charset=utf-8" }), "horario-pacientes.ics");
  }

  return (
    <AppShell
      title="Pacientes"
      description={`Directorio de pacientes. Totales del mes: ${monthLabel(month)}.`}
      actions={
        <>
          {withSchedule.length > 0 ? (
            <Button variant="secondary" onClick={downloadCalendar}>
              Descargar horario (.ics)
            </Button>
          ) : null}
          <AddPatientButton />
        </>
      }
    >
      <div className="mb-4 flex gap-1">
        {(
          [
            ["activos", `En tratamiento (${activeCount})`],
            ["inactivos", `Ya no vienen (${patients.length - activeCount})`],
            ["todos", `Todos (${patients.length})`],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm transition-colors",
              filter === value ? "bg-dark text-background" : "text-dark/60 hover:bg-dark/[0.05] hover:text-dark"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {stale.length > 0 && filter !== "inactivos" ? (
        <Alert
          variant="accent"
          className="mb-4"
          title={`${stale.length} ${stale.length === 1 ? "paciente no tiene" : "pacientes no tienen"} sesiones hace más de ${INACTIVITY_DAYS} días`}
        >
          {stale.map(({ patient }) => patient.name).join(", ")}. Si ya no vienen, márcalos para que dejen de
          aparecer en los cortes de cada mes (se usa la fecha de su última sesión; su historial se conserva).{" "}
          <button type="button" className="font-medium text-blue-accent" onClick={markStaleAsInactive}>
            Marcar que ya no vienen
          </button>
        </Alert>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title={filter === "inactivos" ? "Nadie ha dejado de venir" : "Sin pacientes"}
          description={
            filter === "inactivos"
              ? "Cuando un paciente deje de venir, márcalo en su ficha."
              : "Agrega un paciente o importa tu Excel."
          }
        />
      ) : (
        <Card>
          <Table>
            <Thead>
              <Tr>
                <Th className="pl-6">Paciente</Th>
                <Th>Estado</Th>
                <Th>Horario</Th>
                <Th>Modalidad de pago</Th>
                <Th align="right">Costo/sesión</Th>
                <Th align="right">Sesiones del mes</Th>
                <Th align="right">Pagado del mes</Th>
                <Th align="right">Pendiente del mes</Th>
                <Th align="right">Pagado histórico</Th>
                <Th align="right" className="pr-6">
                  Pendiente histórico
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {visible.map((patient) => {
                const monthTotals = patientTotals(patient.id, sessions, payments, month);
                const historic = patientTotals(patient.id, sessions, payments);

                return (
                  <Tr
                    key={patient.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/pacientes/${patient.id}`)}
                  >
                    <Td className="pl-6 font-medium">{patient.name}</Td>
                    <Td>
                      <PatientStatusBadge status={patient.status} />
                      {patient.endDate ? (
                        <span className="ml-2 text-xs text-dark/45">desde {formatDate(patient.endDate)}</span>
                      ) : null}
                    </Td>
                    <Td className="text-dark/70">{describeSchedule(patient)}</Td>
                    <Td className="text-dark/70">{paymentModalityLabels[patient.paymentModality]}</Td>
                    <Td align="right">{formatCurrency(patient.costPerSession, patient.currency)}</Td>
                    <Td align="right">{monthTotals.sessionsCount}</Td>
                    <Td align="right">{formatCurrency(monthTotals.paid, patient.currency)}</Td>
                    <Td
                      align="right"
                      className={monthTotals.pending > 0 ? "font-medium text-debt-red" : "text-dark/40"}
                    >
                      {monthTotals.pending > 0 ? formatCurrency(monthTotals.pending, patient.currency) : "—"}
                    </Td>
                    <Td align="right">{formatCurrency(historic.paid, patient.currency)}</Td>
                    <Td
                      align="right"
                      className={cn("pr-6", historic.pending > 0 ? "font-medium text-debt-red" : "text-dark/40")}
                    >
                      {historic.pending > 0 ? formatCurrency(historic.pending, patient.currency) : "—"}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Card>
      )}
    </AppShell>
  );
}
