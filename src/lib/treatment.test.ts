import { describe, expect, it } from "vitest";
import { runChecks } from "@/lib/checks";
import {
  appearsInMonth,
  endTreatmentPatch,
  isActiveInMonth,
  isCurrentlyActive,
  resumeTreatmentPatch,
} from "@/lib/treatment";
import type { Patient, Session } from "@/lib/types";

const base: Patient = {
  id: "a",
  name: "Paciente Prueba",
  startDate: "2026-01-10",
  status: "activo",
  sessionFrequency: "semanal-1",
  paymentModality: "por-sesion",
  costPerSession: 600,
  currency: "MXN",
};

describe("periodos de tratamiento", () => {
  const ended: Patient = { ...base, ...endTreatmentPatch("2026-03-20") };

  it("deja de aparecer en los meses posteriores a la baja", () => {
    expect(isCurrentlyActive(ended)).toBe(false);
    expect(isActiveInMonth(ended, "2026-03")).toBe(true);
    expect(isActiveInMonth(ended, "2026-04")).toBe(false);
    expect(isActiveInMonth(ended, "2025-12")).toBe(false);
  });

  it("sigue apareciendo en un mes si tiene sesiones en él", () => {
    const sessions: Session[] = [{ id: "s", patientId: "a", date: "2026-05-02", amount: 600 }];
    expect(appearsInMonth(ended, "2026-05", sessions)).toBe(true);
    expect(appearsInMonth(ended, "2026-06", sessions)).toBe(false);
  });

  it("al regresar guarda el periodo anterior y vuelve a aparecer desde la fecha de regreso", () => {
    const back: Patient = { ...ended, ...resumeTreatmentPatch(ended, "2026-08-04") };
    expect(isCurrentlyActive(back)).toBe(true);
    expect(back.pastPeriods).toEqual([{ start: "2026-01-10", end: "2026-03-20" }]);
    expect(isActiveInMonth(back, "2026-02")).toBe(true);
    expect(isActiveInMonth(back, "2026-05")).toBe(false);
    expect(isActiveInMonth(back, "2026-09")).toBe(true);
  });

  it("la revisión avisa si hay sesiones después de la baja", () => {
    const sessions: Session[] = [{ id: "s", patientId: "a", date: "2026-05-02", amount: 600 }];
    const kinds = runChecks([ended], sessions, [], new Date(2026, 10, 25)).map((i) => i.kind);
    expect(kinds).toContain("sesion-despues-de-baja");
  });
});
