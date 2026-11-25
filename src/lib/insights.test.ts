import { describe, expect, it } from "vitest";
import { closedMonths, yearInsights } from "@/lib/insights";
import { yearSummary } from "@/lib/metrics";
import { vacationDaysInMonth, isOnVacation } from "@/lib/vacations";
import type { Patient, Payment, Session } from "@/lib/types";

const patient: Patient = {
  id: "a",
  name: "A",
  startDate: "2025-01-01",
  status: "activo",
  sessionFrequency: "semanal-1",
  paymentModality: "por-sesion",
  costPerSession: 500,
  currency: "MXN",
};

function summaryFor(year: number, perMonth: number[]) {
  const sessions: Session[] = [];
  const payments: Payment[] = [];
  perMonth.forEach((amount, m) => {
    if (!amount) return;
    const id = `${year}-${m}`;
    sessions.push({ id, patientId: "a", date: `${year}-${String(m + 1).padStart(2, "0")}-10`, amount });
    payments.push({ id: `p${id}`, patientId: "a", amount, date: "x", sessionIds: [id], source: "manual", createdAt: "x" });
  });
  return yearSummary([patient], sessions, payments, year);
}

describe("insights del año", () => {
  const today = new Date(2026, 10, 25); // 25 nov 2026

  it("en el año en curso no cuenta el mes que no ha terminado", () => {
    const s = summaryFor(2026, [100, 200, 300, 0, 0, 0, 0, 0, 0, 900, 50, 0]);
    expect(closedMonths(s, today)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const i = yearInsights(s, null, today);
    expect(i.best).toEqual({ month: 9, paid: 900 });
    expect(i.tightest?.paid).toBe(0); // abril: un mes cerrado sin ingresos
    expect(i.average).toBe(150);
  });

  it("en años pasados usa del primer al último mes con datos", () => {
    const s = summaryFor(2025, [0, 0, 400, 600, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(closedMonths(s, today)).toEqual([2, 3]);
    expect(yearInsights(s, null, today).tightest).toEqual({ month: 2, paid: 400 });
  });

  it("compara con el año anterior solo en los mismos meses cerrados", () => {
    const prev = summaryFor(2025, [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 5000]);
    const cur = summaryFor(2026, [150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 0, 0]);
    const i = yearInsights(cur, prev, today);
    expect(i.vsPrevious).toEqual({ previousPaid: 1000, currentPaid: 1500, change: 0.5 });
  });

  it("un año futuro no tiene meses cerrados", () => {
    expect(closedMonths(summaryFor(2027, []), today)).toEqual([]);
  });
});

describe("vacaciones", () => {
  const vacations = [{ id: "v", start: "2026-12-20", end: "2027-01-06" }];
  it("cuenta los días que caen en cada mes", () => {
    expect(vacationDaysInMonth(vacations, 2026, 11)).toBe(12);
    expect(vacationDaysInMonth(vacations, 2027, 0)).toBe(6);
    expect(vacationDaysInMonth(vacations, 2026, 10)).toBe(0);
  });
  it("detecta si una fecha cae en vacaciones", () => {
    expect(isOnVacation(vacations, "2026-12-24")).toBe(true);
    expect(isOnVacation(vacations, "2027-01-07")).toBe(false);
  });
});
