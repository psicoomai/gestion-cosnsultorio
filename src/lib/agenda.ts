// Agenda semanal: junta las sesiones ya registradas con las que se esperan
// según el horario de cada paciente activo. Las esperadas son solo una guía:
// nunca se registran solas, la persona las confirma con un clic (asistió,
// faltó, canceló). Los días de vacaciones no generan sesiones esperadas.

import { todayIso } from "@/lib/format";
import { isActiveOn } from "@/lib/treatment";
import type { Patient, Session, Vacation } from "@/lib/types";
import { isOnVacation } from "@/lib/vacations";

export interface AgendaItem {
  date: string;
  time?: string;
  patient: Patient;
  /** La sesión registrada; si no hay, es una sesión esperada por el horario. */
  session?: Session;
}

export interface AgendaDay {
  date: string;
  onVacation: boolean;
  items: AgendaItem[];
}

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + days);
  return todayIso(d);
}

/** Lunes de la semana de `iso`. */
export function startOfWeek(iso: string): string {
  const d = parse(iso);
  const offset = (d.getDay() + 6) % 7; // lunes = 0
  d.setDate(d.getDate() - offset);
  return todayIso(d);
}

/** Días mínimos entre sesiones para no esperar una sesión de un paciente quincenal o mensual. */
function minGapDays(patient: Patient): number {
  if (patient.sessionFrequency === "quincenal") return 13;
  if (patient.sessionFrequency === "mensual") return 27;
  return 0;
}

export function agendaWeek(
  weekStart: string,
  patients: Patient[],
  sessions: Session[],
  vacations: Vacation[]
): AgendaDay[] {
  const byPatient = new Map<string, Session[]>();
  for (const s of sessions) byPatient.set(s.patientId, [...(byPatient.get(s.patientId) ?? []), s]);
  const patientById = new Map(patients.map((p) => [p.id, p]));

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const weekday = parse(date).getDay();
    const onVacation = isOnVacation(vacations, date);
    const items: AgendaItem[] = [];

    for (const s of sessions) {
      if (s.date !== date) continue;
      const patient = patientById.get(s.patientId);
      if (!patient) continue;
      const slot = patient.schedule?.find((sl) => sl.weekday === weekday);
      items.push({ date, time: slot?.time, patient, session: s });
    }

    if (!onVacation) {
      for (const patient of patients) {
        if (!isActiveOn(patient, date)) continue;
        const own = byPatient.get(patient.id) ?? [];
        if (own.some((s) => s.date === date)) continue;
        const gap = minGapDays(patient);
        if (gap > 0 && own.some((s) => s.date < date && s.date >= addDays(date, -gap))) continue;
        for (const slot of patient.schedule ?? []) {
          if (slot.weekday === weekday) items.push({ date, time: slot.time, patient });
        }
      }
    }

    items.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99") || a.patient.name.localeCompare(b.patient.name, "es"));
    return { date, onVacation, items };
  });
}
