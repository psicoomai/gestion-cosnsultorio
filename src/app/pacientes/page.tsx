"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PatientStatusBadge } from "@/components/ui/PatientStatusBadge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { AddPatientButton } from "@/components/patients/AddPatientButton";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { currentMonthKey, monthLabel, patientTotals } from "@/lib/metrics";
import { formatCurrency } from "@/lib/format";
import { paymentModalityLabels, sessionFrequencyLabels } from "@/lib/types";

export default function PacientesPage() {
  const { patients, sessions, payments } = useClinicData();
  const router = useRouter();
  const month = currentMonthKey();

  return (
    <AppShell
      title="Pacientes"
      description={`Directorio de pacientes. Totales del mes: ${monthLabel(month)}.`}
      actions={<AddPatientButton />}
    >
      <Card>
        <Table>
          <Thead>
            <Tr>
              <Th className="pl-6">Paciente</Th>
              <Th>Estado</Th>
              <Th>Frecuencia</Th>
              <Th>Modalidad de pago</Th>
              <Th align="right">Costo/sesión</Th>
              <Th align="right">Sesiones del mes</Th>
              <Th align="right">Generado del mes</Th>
              <Th align="right">Pagado del mes</Th>
              <Th align="right">Pendiente del mes</Th>
              <Th align="right">Pagado histórico</Th>
              <Th align="right">Pendiente histórico</Th>
              <Th align="right" className="pr-6">
                Total completo histórico
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {patients.map((patient) => {
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
                  </Td>
                  <Td className="text-dark/70">{sessionFrequencyLabels[patient.sessionFrequency]}</Td>
                  <Td className="text-dark/70">{paymentModalityLabels[patient.paymentModality]}</Td>
                  <Td align="right">{formatCurrency(patient.costPerSession, patient.currency)}</Td>
                  <Td align="right">{monthTotals.sessionsCount}</Td>
                  <Td align="right">{formatCurrency(monthTotals.generated, patient.currency)}</Td>
                  <Td align="right">{formatCurrency(monthTotals.paid, patient.currency)}</Td>
                  <Td align="right" className={monthTotals.pending > 0 ? "text-debt-red font-medium" : "text-dark/40"}>
                    {monthTotals.pending > 0 ? formatCurrency(monthTotals.pending, patient.currency) : "—"}
                  </Td>
                  <Td align="right">{formatCurrency(historic.paid, patient.currency)}</Td>
                  <Td align="right" className={historic.pending > 0 ? "text-debt-red font-medium" : "text-dark/40"}>
                    {historic.pending > 0 ? formatCurrency(historic.pending, patient.currency) : "—"}
                  </Td>
                  <Td align="right" className="pr-6">
                    {formatCurrency(historic.complete, patient.currency)}
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
