// Funciones puras para calcular todo lo financiero a partir de las sesiones
// y los pagos reales. Ningún total se guarda como campo suelto en el
// paciente — ver punto 10 de las indicaciones del producto.

import type { Currency, Patient, Payment, Session, SessionStatus } from "@/lib/types";

/** Reparte cada pago entre las sesiones a las que se aplicó, en orden, sin rebasar el costo de cada una. */
export function sessionPaidMap(sessions: Session[], payments: Payment[]): Map<string, number> {
  const paid = new Map<string, number>();
  const amountById = new Map(sessions.map((s) => [s.id, s.amount]));

  for (const payment of payments) {
    let remaining = payment.amount;
    for (const sessionId of payment.sessionIds) {
      if (remaining <= 0) break;
      const sessionAmount = amountById.get(sessionId);
      if (sessionAmount === undefined) continue;
      const already = paid.get(sessionId) ?? 0;
      const owed = sessionAmount - already;
      if (owed <= 0) continue;
      const applied = Math.min(owed, remaining);
      paid.set(sessionId, already + applied);
      remaining -= applied;
    }
  }
  return paid;
}

export function sessionStatus(session: Session, paidAmount: number): SessionStatus {
  if (paidAmount <= 0) return "pendiente";
  if (paidAmount >= session.amount) return "pagada";
  return "parcial";
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

const monthLabelFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

export function monthLabel(key: string): string {
  const label = monthLabelFormatter.format(new Date(`${key}-02T00:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function patientSessions(patientId: string, sessions: Session[]): Session[] {
  return sessions
    .filter((s) => s.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function patientPayments(patientId: string, payments: Payment[]): Payment[] {
  return payments
    .filter((p) => p.patientId === patientId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Meses (más reciente primero) en los que el paciente tiene al menos una sesión. */
export function patientMonths(patientId: string, sessions: Session[]): string[] {
  const keys = new Set(patientSessions(patientId, sessions).map((s) => monthKey(s.date)));
  return [...keys].sort((a, b) => b.localeCompare(a));
}

export interface Totals {
  sessionsCount: number;
  generated: number;
  paid: number;
  pending: number;
  /** TOTAL COMPLETO = TOTAL PAGADO + TOTAL PENDIENTE (nunca otro significado). */
  complete: number;
}

/**
 * Totales de un paciente calculados desde sus sesiones y pagos reales.
 * Si se pasa `month` (formato "YYYY-MM"), filtra solo esas sesiones;
 * si se omite, son los totales históricos completos.
 */
export function patientTotals(
  patientId: string,
  sessions: Session[],
  payments: Payment[],
  month?: string
): Totals {
  const allSessions = sessions.filter((s) => s.patientId === patientId);
  const scoped = month ? allSessions.filter((s) => monthKey(s.date) === month) : allSessions;
  const paidMap = sessionPaidMap(allSessions, payments.filter((p) => p.patientId === patientId));

  const generated = scoped.reduce((sum, s) => sum + s.amount, 0);
  const paid = scoped.reduce((sum, s) => sum + Math.min(paidMap.get(s.id) ?? 0, s.amount), 0);
  const pending = generated - paid;

  return {
    sessionsCount: scoped.length,
    generated,
    paid,
    pending,
    complete: paid + pending,
  };
}

/** Si el paciente tiene alguna sesión con saldo pendiente (para exigir que un pago se aplique a alguna). */
export function hasUnpaidSessions(patientId: string, sessions: Session[], payments: Payment[]): boolean {
  const patientPaymentsList = payments.filter((p) => p.patientId === patientId);
  const paidMap = sessionPaidMap(sessions, patientPaymentsList);
  return sessions.some((s) => s.patientId === patientId && (paidMap.get(s.id) ?? 0) < s.amount);
}

export function currentMonthKey(): string {
  return monthKey(new Date().toISOString());
}

export function allPatientsTotals(
  patients: Patient[],
  sessions: Session[],
  payments: Payment[],
  month?: string
): Totals {
  return patients.reduce<Totals>(
    (acc, patient) => {
      const t = patientTotals(patient.id, sessions, payments, month);
      return {
        sessionsCount: acc.sessionsCount + t.sessionsCount,
        generated: acc.generated + t.generated,
        paid: acc.paid + t.paid,
        pending: acc.pending + t.pending,
        complete: acc.complete + t.complete,
      };
    },
    { sessionsCount: 0, generated: 0, paid: 0, pending: 0, complete: 0 }
  );
}

/**
 * Igual que allPatientsTotals, pero separado por moneda: sumar montos en
 * MXN y USD en un solo total sería incorrecto, así que cada moneda que
 * aparezca entre los pacientes obtiene su propio acumulado.
 */
export function allPatientsTotalsByCurrency(
  patients: Patient[],
  sessions: Session[],
  payments: Payment[],
  month?: string
): Partial<Record<Currency, Totals>> {
  const byCurrency: Partial<Record<Currency, Totals>> = {};
  for (const patient of patients) {
    const t = patientTotals(patient.id, sessions, payments, month);
    const acc = byCurrency[patient.currency] ?? {
      sessionsCount: 0,
      generated: 0,
      paid: 0,
      pending: 0,
      complete: 0,
    };
    byCurrency[patient.currency] = {
      sessionsCount: acc.sessionsCount + t.sessionsCount,
      generated: acc.generated + t.generated,
      paid: acc.paid + t.paid,
      pending: acc.pending + t.pending,
      complete: acc.complete + t.complete,
    };
  }
  return byCurrency;
}

/** Genera los últimos `count` meses (más antiguo primero) con generado/cobrado, para la gráfica del panel. */
export function monthlyTotals(
  sessions: Session[],
  payments: Payment[],
  count: number
): { month: string; label: string; generado: number; cobrado: number }[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const paidMap = sessionPaidMap(sessions, payments);

  return keys.map((key) => {
    const scoped = sessions.filter((s) => monthKey(s.date) === key);
    const generado = scoped.reduce((sum, s) => sum + s.amount, 0);
    const cobrado = scoped.reduce((sum, s) => sum + Math.min(paidMap.get(s.id) ?? 0, s.amount), 0);
    return { month: key, label: monthLabel(key).split(" ")[0], generado, cobrado };
  });
}
