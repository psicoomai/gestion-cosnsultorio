import { describe, expect, it } from "vitest";
import { allocatePayments, yearSummary } from "@/lib/metrics";
import type { Patient, Payment, Session } from "@/lib/types";

const patient = (id: string, name = id): Patient => ({
  id,
  name,
  startDate: "2026-01-01",
  status: "activo",
  sessionFrequency: "semanal-1",
  paymentModality: "por-sesion",
  costPerSession: 700,
  currency: "MXN",
});
const session = (id: string, patientId: string, date: string, amount = 700): Session => ({ id, patientId, date, amount });
const payment = (id: string, patientId: string, amount: number, sessionIds: string[], date = "2026-02-01"): Payment => ({
  id,
  patientId,
  amount,
  date,
  sessionIds,
  source: "manual",
  createdAt: `${date}T10:00:00.000Z`,
});

describe("allocatePayments", () => {
  it("no aplica a una sesión más de su costo y reporta el sobrante como sin aplicar", () => {
    const sessions = [session("s1", "a", "2026-01-10")];
    const { sessionPaid, paymentApplied } = allocatePayments(sessions, [
      payment("p1", "a", 700, ["s1"]),
      payment("p2", "a", 700, ["s1"], "2026-02-02"),
    ]);
    expect(sessionPaid.get("s1")).toBe(700);
    expect(paymentApplied.get("p1")).toBe(700);
    expect(paymentApplied.get("p2")).toBe(0);
  });

  it("ignora sesiones borradas", () => {
    const { paymentApplied } = allocatePayments([], [payment("p1", "a", 500, ["borrada"])]);
    expect(paymentApplied.get("p1")).toBe(0);
  });
});

describe("yearSummary", () => {
  it("asigna cada sesión al mes de su fecha y cuadra por paciente, por mes y directo", () => {
    const patients = [patient("a"), patient("b")];
    const sessions = [
      session("s1", "a", "2026-07-28"),
      session("s2", "a", "2026-08-04", 450),
      session("s3", "b", "2026-08-10", 600),
      session("s4", "b", "2025-12-30", 999),
    ];
    const payments = [payment("p1", "a", 1150, ["s1", "s2"]), payment("p2", "b", 300, ["s3"])];
    const y = yearSummary(patients, sessions, payments, 2026);

    expect(y.months[6].paid).toBe(700); // julio
    expect(y.months[7].paid).toBe(750); // agosto: 450 + 300
    expect(y.months[7].pending).toBe(300);
    expect(y.total.paid).toBe(1450);
    expect(y.total.generated).toBe(1750); // la sesión de 2025 no entra
    expect(y.reconciliation).toEqual({ byPatients: 1450, byMonths: 1450, direct: 1450, ok: true });
  });

  it("evita residuos de punto flotante en los centavos", () => {
    const sessions = [session("s1", "a", "2026-08-01", 1234.56), session("s2", "a", "2026-09-01", 4321.11)];
    const y = yearSummary([patient("a")], sessions, [payment("p", "a", 5555.67, ["s1", "s2"])], 2026);
    expect(y.reconciliation.direct).toBe(5555.67);
  });
});
