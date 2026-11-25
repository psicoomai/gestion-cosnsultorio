// Funciones puras para calcular todo lo financiero a partir de las sesiones
// y los pagos reales. Ningún total se guarda como campo suelto en el
// paciente — ver punto 10 de las indicaciones del producto.

import { todayIso } from "@/lib/format";
import type { Currency, Patient, Payment, Session, SessionStatus } from "@/lib/types";

export interface Allocation {
  /** Cuánto se ha pagado de cada sesión (nunca más que su costo). */
  sessionPaid: Map<string, number>;
  /** Cuánto de cada pago quedó efectivamente aplicado a sesiones. */
  paymentApplied: Map<string, number>;
}

/** Orden estable para aplicar pagos: por fecha de pago y luego por fecha de registro. */
function byPaymentOrder(a: Payment, b: Payment): number {
  return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/**
 * Reparte cada pago entre las sesiones a las que se aplicó, en orden, sin
 * rebasar el costo de cada una. Lo que un pago no alcanza a aplicar (porque
 * sus sesiones ya estaban cubiertas o se borraron) queda como "sin aplicar":
 * ese dinero NO cuenta como cobrado, y la Revisión lo señala.
 */
export function allocatePayments(sessions: Session[], payments: Payment[]): Allocation {
  const sessionPaid = new Map<string, number>();
  const paymentApplied = new Map<string, number>();
  const amountById = new Map(sessions.map((s) => [s.id, s.amount]));

  for (const payment of [...payments].sort(byPaymentOrder)) {
    let remaining = payment.amount;
    let applied = 0;
    for (const sessionId of payment.sessionIds) {
      if (remaining <= 0) break;
      const sessionAmount = amountById.get(sessionId);
      if (sessionAmount === undefined) continue;
      const already = sessionPaid.get(sessionId) ?? 0;
      const owed = sessionAmount - already;
      if (owed <= 0) continue;
      const amount = Math.min(owed, remaining);
      sessionPaid.set(sessionId, already + amount);
      remaining -= amount;
      applied += amount;
    }
    paymentApplied.set(payment.id, applied);
  }
  return { sessionPaid, paymentApplied };
}

/** Reparte cada pago entre las sesiones a las que se aplicó, en orden, sin rebasar el costo de cada una. */
export function sessionPaidMap(sessions: Session[], payments: Payment[]): Map<string, number> {
  return allocatePayments(sessions, payments).sessionPaid;
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
  return monthKey(todayIso());
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

/** Suma con redondeo a centavos, para que 0.1 + 0.2 no deje residuos al comparar totales. */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface MonthCell {
  generated: number;
  paid: number;
  pending: number;
}

export interface YearPatientRow {
  patient: Patient;
  months: MonthCell[]; // 12 posiciones, enero = 0
  total: MonthCell;
}

export interface YearSummary {
  year: number;
  rows: YearPatientRow[];
  /** Totales por mes, sumando las sesiones de ese mes (no las filas de pacientes). */
  months: MonthCell[];
  /** Total del año, sumando todas las sesiones del año directamente. */
  total: MonthCell;
  /**
   * Comprobación de cuadre: los tres caminos para llegar al total cobrado
   * (por paciente, por mes y directo) deben dar exactamente lo mismo.
   */
  reconciliation: { byPatients: number; byMonths: number; direct: number; ok: boolean };
}

const emptyCell = (): MonthCell => ({ generated: 0, paid: 0, pending: 0 });

function addToCell(cell: MonthCell, generated: number, paid: number) {
  cell.generated += generated;
  cell.paid += paid;
  cell.pending += generated - paid;
}

/**
 * Corte anual equivalente a la hoja TOTALES de un Excel de consultorio:
 * honorarios (REAL), cobrado y por cobrar, por mes y por paciente. Cada
 * sesión pertenece al mes de su fecha — imposible contarla en dos meses o
 * olvidar a un paciente en la suma.
 */
export function yearSummary(
  patients: Patient[],
  sessions: Session[],
  payments: Payment[],
  year: number
): YearSummary {
  const { sessionPaid } = allocatePayments(sessions, payments);
  const prefix = `${year}-`;
  const yearSessions = sessions.filter((s) => s.date.startsWith(prefix));

  const rowsById = new Map<string, YearPatientRow>(
    patients.map((patient) => [
      patient.id,
      { patient, months: Array.from({ length: 12 }, emptyCell), total: emptyCell() },
    ])
  );
  const months = Array.from({ length: 12 }, emptyCell);
  const total = emptyCell();

  for (const session of yearSessions) {
    const row = rowsById.get(session.patientId);
    if (!row) continue;
    const monthIndex = Number(session.date.slice(5, 7)) - 1;
    const paid = Math.min(sessionPaid.get(session.id) ?? 0, session.amount);
    addToCell(row.months[monthIndex], session.amount, paid);
    addToCell(row.total, session.amount, paid);
    addToCell(months[monthIndex], session.amount, paid);
    addToCell(total, session.amount, paid);
  }

  const rows = [...rowsById.values()];
  const byPatients = roundCents(rows.reduce((sum, r) => sum + r.total.paid, 0));
  const byMonths = roundCents(months.reduce((sum, m) => sum + m.paid, 0));
  const direct = roundCents(total.paid);

  return {
    year,
    rows,
    months,
    total,
    reconciliation: { byPatients, byMonths, direct, ok: byPatients === byMonths && byMonths === direct },
  };
}

/** Años con al menos una sesión, más el año en curso y el próximo (más reciente primero). */
export function availableYears(sessions: Session[]): number[] {
  const years = new Set(sessions.map((s) => Number(s.date.slice(0, 4))));
  const current = new Date().getFullYear();
  years.add(current);
  years.add(current + 1);
  return [...years].filter(Number.isFinite).sort((a, b) => b - a);
}
