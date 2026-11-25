// Vacaciones de quien da consulta: sirven para explicar meses con menos
// ingresos, para no llenar sesiones en esos días y para avisar si se
// registró una sesión durante las vacaciones.

import type { Vacation } from "@/lib/types";

export function isOnVacation(vacations: Vacation[], date: string): boolean {
  return vacations.some((v) => v.start <= date && date <= v.end);
}

function daysBetweenInclusive(start: string, end: string): number {
  const a = Date.parse(`${start}T12:00:00Z`);
  const b = Date.parse(`${end}T12:00:00Z`);
  return Math.round((b - a) / 86400000) + 1;
}

/** Días de vacaciones que caen en un mes (monthIndex: enero = 0). */
export function vacationDaysInMonth(vacations: Vacation[], year: number, monthIndex: number): number {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const monthStart = `${year}-${mm}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const monthEnd = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  let days = 0;
  for (const v of vacations) {
    const start = v.start > monthStart ? v.start : monthStart;
    const end = v.end < monthEnd ? v.end : monthEnd;
    if (start <= end) days += daysBetweenInclusive(start, end);
  }
  return Math.min(days, lastDay);
}

export function vacationLength(v: Vacation): number {
  return daysBetweenInclusive(v.start, v.end);
}
