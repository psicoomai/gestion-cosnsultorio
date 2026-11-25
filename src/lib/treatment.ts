// Periodos de tratamiento: cuándo un paciente está "en terapia". Sirve para
// que quien dejó de venir no siga apareciendo en los cortes de los meses
// siguientes, sin perder su historial ni sus adeudos.

import { monthKey } from "@/lib/metrics";
import type { Patient, Session } from "@/lib/types";

/** Todos los periodos del paciente: los anteriores y el actual (abierto si no tiene fecha de baja). */
export function treatmentPeriods(patient: Patient): { start: string; end?: string }[] {
  return [...(patient.pastPeriods ?? []), { start: patient.startDate, end: patient.endDate }];
}

/** `true` si estaba en tratamiento en algún momento del mes ("YYYY-MM"). */
export function isActiveInMonth(patient: Patient, month: string): boolean {
  if (patient.status === "inactivo" && !patient.endDate) return false;
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;
  return treatmentPeriods(patient).some((p) => p.start <= monthEnd && (!p.end || p.end >= monthStart));
}

/**
 * Si el paciente debe aparecer en el corte de un mes: porque estaba en
 * tratamiento, o porque tiene sesiones ese mes (aunque ya esté de baja).
 */
export function appearsInMonth(patient: Patient, month: string, sessions: Session[]): boolean {
  return isActiveInMonth(patient, month) || sessions.some((s) => s.patientId === patient.id && monthKey(s.date) === month);
}

export function isCurrentlyActive(patient: Patient): boolean {
  return patient.status !== "inactivo" && !patient.endDate;
}

/** Cambios para marcar que dejó de venir en `endDate`. */
export function endTreatmentPatch(endDate: string): Partial<Patient> {
  return { status: "inactivo", endDate };
}

/** Cambios para registrar que regresó a terapia en `restartDate`, guardando el periodo anterior. */
export function resumeTreatmentPatch(patient: Patient, restartDate: string): Partial<Patient> {
  const previous = patient.endDate
    ? [...(patient.pastPeriods ?? []), { start: patient.startDate, end: patient.endDate }]
    : patient.pastPeriods;
  return { status: "activo", startDate: restartDate, endDate: undefined, pastPeriods: previous };
}

/** Fecha de la última sesión registrada del paciente, si tiene. */
export function lastSessionDate(patientId: string, sessions: Session[]): string | undefined {
  return sessions
    .filter((s) => s.patientId === patientId)
    .map((s) => s.date)
    .sort()
    .pop();
}

/** `true` si el paciente estaba en tratamiento en esa fecha (yyyy-mm-dd). */
export function isActiveOn(patient: Patient, date: string): boolean {
  if (patient.status === "inactivo" && !patient.endDate) return false;
  return treatmentPeriods(patient).some((p) => p.start <= date && (!p.end || date <= p.end));
}
