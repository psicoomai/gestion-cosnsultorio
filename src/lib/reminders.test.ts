import { describe, expect, it } from "vitest";
import { buildReminderMessage, pendingSessions, whatsappNumber, whatsappUrl } from "@/lib/reminders";
import { statementData } from "@/lib/statement-pdf";
import type { Patient, Payment, Session } from "@/lib/types";

const patient: Patient = {
  id: "a",
  name: "Paula Prueba Ruiz",
  phone: "55 1234 5678",
  startDate: "2026-01-01",
  status: "activo",
  sessionFrequency: "semanal-1",
  paymentModality: "por-sesion",
  costPerSession: 600,
  currency: "MXN",
};
const sessions: Session[] = [
  { id: "1", patientId: "a", date: "2026-11-04", amount: 600 },
  { id: "2", patientId: "a", date: "2026-11-11", amount: 600 },
  { id: "3", patientId: "a", date: "2026-10-28", amount: 600 },
];
const payments: Payment[] = [
  { id: "p", patientId: "a", amount: 900, date: "2026-11-01", sessionIds: ["3", "1"], source: "manual", createdAt: "x" },
];

describe("recordatorios de pago", () => {
  it("lista lo pendiente, incluyendo pagos parciales", () => {
    const pending = pendingSessions("a", sessions, payments);
    expect(pending.map((p) => [p.session.date, p.pending])).toEqual([
      ["2026-11-04", 300],
      ["2026-11-11", 600],
    ]);
  });

  it("arma el mensaje con la plantilla y los datos de pago", () => {
    const msg = buildReminderMessage(patient, pendingSessions("a", sessions, payments), {
      name: "Psic. Ana",
      paymentDetails: "CLABE 123",
    });
    expect(msg).toContain("Hola Paula");
    expect(msg).toContain("$900.00 por 2 sesiones");
    expect(msg).toContain("(faltan $300.00)");
    expect(msg).toContain("CLABE 123");
    expect(msg.endsWith("Psic. Ana")).toBe(true);
  });

  it("usa una plantilla propia y no deja renglones vacíos sin datos de pago", () => {
    const msg = buildReminderMessage(patient, pendingSessions("a", sessions, payments), {
      name: "Ana",
      reminderTemplate: "Hola {nombre}\n\n{datos_pago}\n\nDebes {monto}",
    });
    expect(msg).toBe("Hola Paula\n\nDebes $900.00");
  });

  it("normaliza teléfonos mexicanos para WhatsApp", () => {
    expect(whatsappNumber("55 1234 5678")).toBe("525512345678");
    expect(whatsappNumber("+52 1 55 1234 5678")).toBe("5215512345678");
    expect(whatsappNumber("123")).toBeNull();
    expect(whatsappUrl(undefined, "hola")).toBe("https://wa.me/?text=hola");
    expect(whatsappUrl("5512345678", "a b")).toBe("https://wa.me/525512345678?text=a%20b");
  });
});

describe("estado de cuenta", () => {
  it("filtra por periodo y suma totales", () => {
    const all = statementData(patient, sessions, payments, { kind: "todo" });
    expect(all.totals).toEqual({ amount: 1800, paid: 900, pending: 900 });
    expect(all.payments).toHaveLength(1);
    const pending = statementData(patient, sessions, payments, { kind: "pendientes" });
    expect(pending.rows.map((r) => r.date)).toEqual(["2026-11-04", "2026-11-11"]);
    expect(pending.payments).toHaveLength(0);
    const y2025 = statementData(patient, sessions, payments, { kind: "anio", year: 2025 });
    expect(y2025.rows).toHaveLength(0);
  });
});
