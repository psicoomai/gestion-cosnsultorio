// Revisión automática de los datos. Los totales de la app se calculan
// siempre desde las sesiones (cada sesión cae en el mes de su fecha y todos
// los pacientes entran en la suma), así que los errores clásicos de una hoja
// de cálculo — un paciente que no entra en el total, una fila contada en dos
// meses — no pueden ocurrir aquí. Lo que sí puede pasar es capturar mal un
// dato. Estas reglas buscan justo eso y lo explican en lenguaje simple.

import { allocatePayments, roundCents } from "@/lib/metrics";
import type { Patient, Payment, Session, Vacation } from "@/lib/types";
import { isOnVacation } from "@/lib/vacations";

/** "adeudo" usa el rojo reservado; "atencion" el naranja; "info" es neutro. */
export type IssueSeverity = "adeudo" | "atencion" | "info";

export type IssueKind =
  | "pago-sin-aplicar"
  | "pago-duplicado"
  | "sesion-duplicada"
  | "fecha-aislada"
  | "sesion-futura"
  | "pago-fecha-rara"
  | "pendiente-antiguo"
  | "sesion-sin-costo"
  | "sesion-despues-de-baja"
  | "sesion-en-vacaciones";

export interface Issue {
  id: string;
  kind: IssueKind;
  severity: IssueSeverity;
  title: string;
  detail: string;
  patientId: string;
  amount?: number;
}

export const issueKindLabels: Record<IssueKind, string> = {
  "pago-sin-aplicar": "Dinero que no entra en Cobrado",
  "pago-duplicado": "Posibles pagos duplicados",
  "sesion-duplicada": "Sesiones repetidas el mismo día",
  "fecha-aislada": "Fechas que parecen mal escritas",
  "sesion-futura": "Sesiones con fecha futura",
  "pago-fecha-rara": "Fechas de pago extrañas",
  "pendiente-antiguo": "Adeudos de hace más de 30 días",
  "sesion-sin-costo": "Sesiones sin costo",
  "sesion-despues-de-baja": "Sesiones después de que el paciente dejó de venir",
  "sesion-en-vacaciones": "Sesiones durante tus vacaciones",
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** Una sesión a más de este número de días de cualquier otra del mismo paciente se considera sospechosa. */
export const ISOLATED_SESSION_DAYS = 120;
export const OLD_DEBT_DAYS = 30;

function toTime(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).getTime();
}

function short(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function money(amount: number): string {
  return `$${roundCents(amount).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
}

export function runChecks(
  patients: Patient[],
  sessions: Session[],
  payments: Payment[],
  today: Date = new Date(),
  vacations: Vacation[] = []
): Issue[] {
  const issues: Issue[] = [];
  const todayTime = toTime(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  );
  const { sessionPaid, paymentApplied } = allocatePayments(sessions, payments);
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  for (const patient of patients) {
    const own = sessions
      .filter((s) => s.patientId === patient.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    const ownPayments = payments.filter((p) => p.patientId === patient.id);

    // 1. Pagos que no se alcanzaron a aplicar a ninguna sesión.
    for (const payment of ownPayments) {
      const unapplied = roundCents(payment.amount - (paymentApplied.get(payment.id) ?? 0));
      if (unapplied > 0.009) {
        issues.push({
          id: `sin-aplicar-${payment.id}`,
          kind: "pago-sin-aplicar",
          severity: "atencion",
          patientId: patient.id,
          amount: unapplied,
          title: `${patient.name}: pago del ${short(payment.date)} con ${money(unapplied)} sin aplicar`,
          detail:
            payment.sessionIds.length === 0
              ? "El pago no está ligado a ninguna sesión, así que no aparece en Cobrado. Regístralo de nuevo eligiendo sus sesiones, o registra primero las sesiones que cubre."
              : "Sus sesiones ya estaban pagadas o fueron eliminadas, así que esa parte no aparece en Cobrado. Puede ser un pago adelantado o un pago registrado dos veces.",
        });
      }
    }

    // 2. Pagos casi idénticos. Dos pagos del mismo monto el mismo día son
    // normales si cubren sesiones distintas; se señalan cuando además cubren
    // la misma sesión, ninguno está ligado a sesiones, o comparten referencia.
    const groups = new Map<string, Payment[]>();
    for (const payment of ownPayments) {
      const key = `${payment.date}|${Math.round(payment.amount)}`;
      groups.set(key, [...(groups.get(key) ?? []), payment]);
      if (payment.reference) {
        const refKey = `ref|${payment.reference.trim().toLowerCase()}`;
        groups.set(refKey, [...(groups.get(refKey) ?? []), payment]);
      }
    }
    for (const [key, list] of groups) {
      if (list.length < 2) continue;
      const byReference = key.startsWith("ref|");
      const sharesSession = list.some((a, i) =>
        list.some((b, j) => j > i && a.sessionIds.some((id) => b.sessionIds.includes(id)))
      );
      const unlinked = list.filter((p) => p.sessionIds.length === 0).length >= 2;
      if (!byReference && !sharesSession && !unlinked) continue;
      const first = list[0];
      issues.push({
        id: `dup-pago-${list.map((p) => p.id).join("-")}`,
        kind: "pago-duplicado",
        severity: "atencion",
        patientId: patient.id,
        amount: first.amount,
        title: byReference
          ? `${patient.name}: ${list.length} pagos con la referencia ${first.reference}`
          : `${patient.name}: ${list.length} pagos de ${money(first.amount)} el ${short(first.date)}`,
        detail: byReference
          ? "Una referencia bancaria debería aparecer en un solo pago. Si es el mismo pago, elimina los repetidos."
          : "Cubren la misma sesión o no están ligados a ninguna. Si es el mismo pago registrado dos veces, elimina uno.",
      });
    }

    // 3. Dos sesiones el mismo día.
    const byDate = new Map<string, Session[]>();
    for (const s of own) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
    for (const [date, list] of byDate) {
      if (list.length > 1) {
        issues.push({
          id: `dup-sesion-${patient.id}-${date}`,
          kind: "sesion-duplicada",
          severity: "atencion",
          patientId: patient.id,
          title: `${patient.name}: ${list.length} sesiones el ${short(date)}`,
          detail: "Si no tuvo dos sesiones ese día, probablemente se registró dos veces y está inflando los totales.",
        });
      }
    }

    // 4. Sesión muy lejos de todas las demás: típico error de año (2025 en vez de 2026).
    if (own.length >= 3) {
      own.forEach((session, index) => {
        const t = toTime(session.date);
        const neighbors = [own[index - 1], own[index + 1]].filter(Boolean) as Session[];
        const nearest = Math.min(...neighbors.map((n) => Math.abs(toTime(n.date) - t)));
        if (nearest > ISOLATED_SESSION_DAYS * DAY_MS) {
          issues.push({
            id: `aislada-${session.id}`,
            kind: "fecha-aislada",
            severity: "atencion",
            patientId: patient.id,
            title: `${patient.name}: sesión del ${short(session.date)} lejos de todas las demás`,
            detail: `Está a más de ${ISOLATED_SESSION_DAYS} días de cualquier otra sesión. Revisa si el año o el mes están bien escritos: si no, cae en el mes equivocado del corte.`,
          });
        }
      });
    }

    // 5. Sesiones con fecha futura: cuentan como "por cobrar" antes de tiempo.
    for (const session of own) {
      if (toTime(session.date) > todayTime) {
        issues.push({
          id: `futura-${session.id}`,
          kind: "sesion-futura",
          severity: "info",
          patientId: patient.id,
          title: `${patient.name}: sesión registrada para el ${short(session.date)}`,
          detail: "Todavía no ocurre, pero ya suma a Por cobrar. Si es un error de fecha, corrígela.",
        });
      }
    }

    // 6. Fecha de pago muy alejada de las sesiones que cubre.
    for (const payment of ownPayments) {
      const covered = payment.sessionIds.map((id) => sessionById.get(id)).filter(Boolean) as Session[];
      if (covered.length === 0) continue;
      const first = Math.min(...covered.map((s) => toTime(s.date)));
      const last = Math.max(...covered.map((s) => toTime(s.date)));
      const paidAt = toTime(payment.date);
      const tooEarly = paidAt < first - 62 * DAY_MS;
      const tooLate = paidAt > last + 366 * DAY_MS;
      if (tooEarly || tooLate || paidAt > todayTime) {
        issues.push({
          id: `fecha-pago-${payment.id}`,
          kind: "pago-fecha-rara",
          severity: "atencion",
          patientId: patient.id,
          title: `${patient.name}: pago con fecha ${short(payment.date)}`,
          detail:
            paidAt > todayTime
              ? "La fecha de pago es futura. Revisa que esté bien escrita."
              : tooEarly
                ? "Es más de dos meses anterior a las sesiones que cubre. Revisa el año."
                : "Es más de un año posterior a las sesiones que cubre. Revisa el año.",
        });
      }
    }

    // 7. Adeudos viejos (para cobranza).
    const old = own.filter(
      (s) =>
        toTime(s.date) < todayTime - OLD_DEBT_DAYS * DAY_MS &&
        (sessionPaid.get(s.id) ?? 0) < s.amount - 0.009
    );
    if (old.length > 0) {
      const owed = old.reduce((sum, s) => sum + s.amount - (sessionPaid.get(s.id) ?? 0), 0);
      issues.push({
        id: `adeudo-${patient.id}`,
        kind: "pendiente-antiguo",
        severity: "adeudo",
        patientId: patient.id,
        amount: roundCents(owed),
        title: `${patient.name} debe ${money(owed)} de hace más de ${OLD_DEBT_DAYS} días`,
        detail: `${old.length} ${old.length === 1 ? "sesión" : "sesiones"} sin pagar, la más antigua del ${short(old[0].date)}.`,
      });
    }

    // 8. Sesiones registradas después de la fecha en que dejó de venir.
    if (patient.endDate) {
      const after = own.filter((s) => s.date > patient.endDate!);
      if (after.length > 0) {
        issues.push({
          id: `despues-baja-${patient.id}`,
          kind: "sesion-despues-de-baja",
          severity: "atencion",
          patientId: patient.id,
          title: `${patient.name}: ${after.length} ${after.length === 1 ? "sesión" : "sesiones"} después del ${short(patient.endDate)}`,
          detail:
            "Está marcado como que ya no viene desde esa fecha. Si regresó a terapia, reactívalo en su ficha; si no, revisa la fecha de esas sesiones.",
        });
      }
    }

    // 9. Sesiones registradas en días de vacaciones.
    const onVacation = own.filter((s) => isOnVacation(vacations, s.date));
    if (onVacation.length > 0) {
      issues.push({
        id: `vacaciones-${patient.id}`,
        kind: "sesion-en-vacaciones",
        severity: "info",
        patientId: patient.id,
        title: `${patient.name}: ${onVacation.length} ${onVacation.length === 1 ? "sesión" : "sesiones"} en tus vacaciones`,
        detail: `Fecha${onVacation.length === 1 ? "" : "s"}: ${onVacation.map((s) => short(s.date)).join(", ")}. Si sí diste esa sesión está bien; si no, revisa la fecha.`,
      });
    }

    // 10. Sesiones en $0 (gratis o sin capturar el costo).
    for (const session of own) {
      if (session.amount <= 0 && (session.attendance ?? "asistio") === "asistio") {
        issues.push({
          id: `sin-costo-${session.id}`,
          kind: "sesion-sin-costo",
          severity: "info",
          patientId: patient.id,
          title: `${patient.name}: sesión del ${short(session.date)} en $0`,
          detail: "Si fue gratuita está bien. Si no, captura su costo para que cuente en los totales.",
        });
      }
    }
  }

  const severityOrder: Record<IssueSeverity, number> = { atencion: 0, adeudo: 1, info: 2 };
  return issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/** Cuánto dinero recibido no está aplicado a sesiones (y por tanto no está en Cobrado). */
export function unappliedTotal(sessions: Session[], payments: Payment[]): number {
  const { paymentApplied } = allocatePayments(sessions, payments);
  return roundCents(
    payments.reduce((sum, p) => sum + Math.max(0, p.amount - (paymentApplied.get(p.id) ?? 0)), 0)
  );
}
