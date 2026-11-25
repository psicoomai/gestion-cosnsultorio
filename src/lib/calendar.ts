// Horario de pacientes y calendario. Sin cuentas ni contraseñas: se generan
// (1) enlaces "Agregar a Google Calendar" con el evento recurrente ya
// prellenado (la persona solo confirma en Google), y (2) un archivo .ics
// que se importa en Google Calendar, Apple Calendar u Outlook. La
// sincronización automática en ambos sentidos requiere conectar una cuenta
// de Google (OAuth) y un servidor — ver README.

import { todayIso } from "@/lib/format";
import type { Patient, SessionFrequency, WeeklySlot } from "@/lib/types";

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
export const DEFAULT_SESSION_MINUTES = 50;

export interface SlotGroup {
  time: string;
  weekdays: number[];
}

/** Junta los días que comparten hora: "martes y jueves 17:00" es un solo evento recurrente. */
export function slotGroups(schedule: WeeklySlot[] = []): SlotGroup[] {
  const byTime = new Map<string, Set<number>>();
  for (const slot of schedule) {
    if (!/^\d{2}:\d{2}$/.test(slot.time) || slot.weekday < 0 || slot.weekday > 6) continue;
    byTime.set(slot.time, (byTime.get(slot.time) ?? new Set()).add(slot.weekday));
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, days]) => ({ time, weekdays: [...days].sort((a, b) => a - b) }));
}

function intervalFor(frequency: SessionFrequency): number {
  if (frequency === "quincenal") return 2;
  if (frequency === "mensual") return 4;
  return 1;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Primer día, a partir de `from` (incluido), que cae en alguno de `weekdays`. */
export function firstOccurrence(from: string, weekdays: number[]): string {
  const date = parseIso(from);
  for (let i = 0; i < 7; i++) {
    if (weekdays.includes(date.getDay())) return todayIso(date);
    date.setDate(date.getDate() + 1);
  }
  return from;
}

/** Fechas (yyyy-mm-dd) entre `from` y `to`, inclusive, que caen en los días del horario. */
export function scheduleDates(schedule: WeeklySlot[] = [], from: string, to: string): string[] {
  const weekdays = new Set(schedule.map((s) => s.weekday));
  if (weekdays.size === 0 || from > to) return [];
  const dates: string[] = [];
  const date = parseIso(from);
  const end = parseIso(to);
  while (date <= end) {
    if (weekdays.has(date.getDay())) dates.push(todayIso(date));
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

function stamp(iso: string, time: string, plusMinutes = 0): string {
  const [h, m] = time.split(":").map(Number);
  const date = parseIso(iso);
  date.setHours(h, m + plusMinutes, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}T${p(date.getHours())}${p(date.getMinutes())}00`;
}

function rrule(patient: Patient, group: SlotGroup): string {
  const interval = intervalFor(patient.sessionFrequency);
  return `RRULE:FREQ=WEEKLY${interval > 1 ? `;INTERVAL=${interval}` : ""};BYDAY=${group.weekdays.map((d) => BYDAY[d]).join(",")}`;
}

function eventTitle(patient: Patient): string {
  return `Sesión — ${patient.name}`;
}

function eventDetails(patient: Patient): string {
  return [patient.meetingUrl ? `Videollamada: ${patient.meetingUrl}` : null, "Creado desde Consultorio"]
    .filter(Boolean)
    .join("\n");
}

/** Enlace que abre Google Calendar con el evento recurrente prellenado (uno por cada hora distinta). */
export function googleCalendarLinks(
  patient: Patient,
  timeZone: string,
  today: string = todayIso()
): { group: SlotGroup; url: string }[] {
  const minutes = patient.sessionMinutes ?? DEFAULT_SESSION_MINUTES;
  const from = patient.startDate > today ? patient.startDate : today;
  return slotGroups(patient.schedule).map((group) => {
    const first = firstOccurrence(from, group.weekdays);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: eventTitle(patient),
      dates: `${stamp(first, group.time)}/${stamp(first, group.time, minutes)}`,
      details: eventDetails(patient),
      recur: rrule(patient, group),
      ctz: timeZone,
    });
    if (patient.meetingUrl) params.set("location", patient.meetingUrl);
    return { group, url: `https://calendar.google.com/calendar/render?${params.toString()}` };
  });
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** Calendario .ics con un evento recurrente por paciente activo y por hora del horario. */
export function buildIcs(patients: Patient[], timeZone: string, today: string = todayIso()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Consultorio//Horario de pacientes//ES", "CALSCALE:GREGORIAN"];
  const dtstamp = `${stamp(today, "00:00")}Z`;
  for (const patient of patients) {
    const minutes = patient.sessionMinutes ?? DEFAULT_SESSION_MINUTES;
    const from = patient.startDate > today ? patient.startDate : today;
    slotGroups(patient.schedule).forEach((group, i) => {
      const first = firstOccurrence(from, group.weekdays);
      lines.push(
        "BEGIN:VEVENT",
        `UID:${patient.id}-${i}@consultorio`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${timeZone}:${stamp(first, group.time)}`,
        `DTEND;TZID=${timeZone}:${stamp(first, group.time, minutes)}`,
        rrule(patient, group),
        `SUMMARY:${escapeIcs(eventTitle(patient))}`,
        `DESCRIPTION:${escapeIcs(eventDetails(patient))}`,
        ...(patient.meetingUrl ? [`LOCATION:${escapeIcs(patient.meetingUrl)}`] : []),
        "END:VEVENT"
      );
    });
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function describeSchedule(patient: Patient): string {
  const names = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const groups = slotGroups(patient.schedule);
  if (groups.length === 0) return "Sin horario fijo";
  return groups
    .map((g) => `${g.weekdays.map((d) => names[d]).join(" y ")} ${g.time}`)
    .join(" · ");
}
