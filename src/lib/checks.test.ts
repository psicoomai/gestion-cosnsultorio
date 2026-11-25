import { describe, expect, it } from "vitest";
import { runChecks, unappliedTotal } from "@/lib/checks";
import type { Patient, Payment, Session } from "@/lib/types";

const today = new Date(2026, 10, 25);
const p: Patient = {
  id: "a",
  name: "Paciente Prueba",
  startDate: "2026-01-01",
  status: "activo",
  sessionFrequency: "semanal-1",
  paymentModality: "por-sesion",
  costPerSession: 700,
  currency: "MXN",
};
const s = (id: string, date: string, amount = 700): Session => ({ id, patientId: "a", date, amount });
const pay = (id: string, amount: number, sessionIds: string[], date = "2026-03-01", reference?: string): Payment => ({
  id,
  patientId: "a",
  amount,
  date,
  sessionIds,
  reference,
  source: "manual",
  createdAt: `${date}T10:00:00.000Z`,
});
const kinds = (sessions: Session[], payments: Payment[]) => runChecks([p], sessions, payments, today).map((i) => i.kind);

describe("runChecks", () => {
  it("no reporta nada en datos limpios", () => {
    const sessions = [s("1", "2026-03-03"), s("2", "2026-03-10"), s("3", "2026-03-17")];
    expect(kinds(sessions, [pay("x", 2100, ["1", "2", "3"], "2026-03-20")])).toEqual([]);
  });

  it("detecta un pago registrado dos veces sobre la misma sesión (y su dinero sin aplicar)", () => {
    const sessions = [s("1", "2026-03-03")];
    const payments = [pay("x", 700, ["1"]), pay("y", 700, ["1"])];
    const k = kinds(sessions, payments);
    expect(k).toContain("pago-duplicado");
    expect(k).toContain("pago-sin-aplicar");
    expect(unappliedTotal(sessions, payments)).toBe(700);
  });

  it("no confunde dos pagos iguales del mismo día que cubren sesiones distintas", () => {
    const sessions = [s("1", "2026-03-03"), s("2", "2026-03-10"), s("3", "2026-03-17")];
    const payments = [pay("x", 700, ["1"]), pay("y", 700, ["2"]), pay("z", 700, ["3"])];
    expect(kinds(sessions, payments)).not.toContain("pago-duplicado");
  });

  it("detecta un año mal escrito (sesión aislada)", () => {
    const sessions = [s("1", "2026-01-14"), s("2", "2025-04-08"), s("3", "2026-01-21"), s("4", "2026-01-28")];
    const payments = [pay("x", 2800, ["1", "2", "3", "4"], "2026-02-01")];
    const issues = runChecks([p], sessions, payments, today).filter((i) => i.kind === "fecha-aislada");
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toContain("08/04/2025");
  });

  it("detecta sesiones repetidas, futuras, adeudos viejos y fechas de pago raras", () => {
    const sessions = [s("1", "2026-06-02"), s("2", "2026-06-02"), s("3", "2026-12-15"), s("4", "2026-06-09")];
    const payments = [pay("x", 700, ["4"], "2024-08-10")];
    const k = kinds(sessions, payments);
    expect(k).toEqual(
      expect.arrayContaining(["sesion-duplicada", "sesion-futura", "pendiente-antiguo", "pago-fecha-rara"])
    );
  });
});
