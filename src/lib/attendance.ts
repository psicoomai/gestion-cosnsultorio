// Asistencia y cancelaciones. Cada sesión puede marcarse como asistió,
// faltó sin avisar, canceló tarde o canceló con anticipación. La política de
// cancelación (Ajustes → Cobranza) decide qué se cobra: una sesión que no se
// cobra queda en $0 y guarda su costo original por si se corrige después.

import type { Attendance, Profile, Session } from "@/lib/types";

export function attendanceOf(session: Session): Attendance {
  return session.attendance ?? "asistio";
}

export function isCharged(attendance: Attendance, profile: Profile | null): boolean {
  if (attendance === "asistio") return true;
  if (attendance === "falto") return profile?.chargeNoShow ?? true;
  if (attendance === "cancelo-tarde") return profile?.chargeLateCancel ?? true;
  return false;
}

/**
 * Cambios para marcar la asistencia de una sesión: si no se cobra, el monto
 * pasa a $0 y se guarda el costo original; si se cobra, se recupera.
 */
export function attendancePatch(
  session: Pick<Session, "amount" | "listPrice">,
  attendance: Attendance,
  profile: Profile | null
): Pick<Session, "attendance" | "amount" | "listPrice"> {
  const price = session.listPrice ?? session.amount;
  if (isCharged(attendance, profile)) {
    return { attendance, amount: price, listPrice: undefined };
  }
  return { attendance, amount: 0, listPrice: price };
}

export interface AttendanceStats {
  scheduled: number;
  attended: number;
  noShows: number;
  lateCancels: number;
  cancels: number;
  /** Asistió / sesiones programadas, entre 0 y 1; `null` si no hay sesiones. */
  rate: number | null;
}

export function attendanceStats(sessions: Session[]): AttendanceStats {
  const stats = { scheduled: sessions.length, attended: 0, noShows: 0, lateCancels: 0, cancels: 0 };
  for (const s of sessions) {
    const a = attendanceOf(s);
    if (a === "asistio") stats.attended++;
    else if (a === "falto") stats.noShows++;
    else if (a === "cancelo-tarde") stats.lateCancels++;
    else stats.cancels++;
  }
  return { ...stats, rate: stats.scheduled ? stats.attended / stats.scheduled : null };
}

export function describeAttendance(stats: AttendanceStats): string {
  if (stats.scheduled === 0) return "Sin sesiones";
  const parts = [`${stats.attended} de ${stats.scheduled}`];
  if (stats.noShows) parts.push(`${stats.noShows} ${stats.noShows === 1 ? "falta" : "faltas"}`);
  if (stats.lateCancels) parts.push(`${stats.lateCancels} ${stats.lateCancels === 1 ? "cancelación tarde" : "cancelaciones tarde"}`);
  if (stats.cancels) parts.push(`${stats.cancels} ${stats.cancels === 1 ? "cancelación" : "cancelaciones"}`);
  return parts.join(" · ");
}
