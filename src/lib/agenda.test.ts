import { describe, expect, it } from "vitest";
import { agendaWeek, startOfWeek } from "@/lib/agenda";
import { attendancePatch, attendanceStats, isCharged } from "@/lib/attendance";
import { parseWorkbook, type RawCell } from "@/lib/import/excel-format";
import { applyImport } from "@/lib/import/apply";
import { runChecks } from "@/lib/checks";
import type { Patient, Session } from "@/lib/types";

const base: Patient = {
  id: "a",
  name: "Ana",
  startDate: "2026-01-01",
  status: "activo",
  sessionFrequency: "semanal-1",
  paymentModality: "por-sesion",
  costPerSession: 600,
  currency: "MXN",
  schedule: [{ weekday: 3, time: "17:00" }], // miércoles
};

describe("asistencia y política de cancelación", () => {
  it("cobra según la política", () => {
    expect(isCharged("asistio", null)).toBe(true);
    expect(isCharged("falto", null)).toBe(true);
    expect(isCharged("falto", { name: "x", chargeNoShow: false })).toBe(false);
    expect(isCharged("cancelo-tarde", { name: "x", chargeLateCancel: false })).toBe(false);
    expect(isCharged("cancelo", null)).toBe(false);
  });

  it("una cancelación queda en $0 y recupera su costo si se corrige", () => {
    const cancelled = attendancePatch({ amount: 600 }, "cancelo", null);
    expect(cancelled).toEqual({ attendance: "cancelo", amount: 0, listPrice: 600 });
    expect(attendancePatch(cancelled, "asistio", null)).toEqual({ attendance: "asistio", amount: 600, listPrice: undefined });
  });

  it("calcula el porcentaje de asistencia", () => {
    const sessions: Session[] = [
      { id: "1", patientId: "a", date: "2026-11-04", amount: 600 },
      { id: "2", patientId: "a", date: "2026-11-11", amount: 600, attendance: "falto" },
      { id: "3", patientId: "a", date: "2026-11-18", amount: 0, attendance: "cancelo", listPrice: 600 },
      { id: "4", patientId: "a", date: "2026-11-25", amount: 600, attendance: "asistio" },
    ];
    const stats = attendanceStats(sessions);
    expect(stats).toMatchObject({ scheduled: 4, attended: 2, noShows: 1, cancels: 1, rate: 0.5 });
  });

  it("una cancelación en $0 no aparece como 'sesión sin costo' en Revisión", () => {
    const sessions: Session[] = [{ id: "3", patientId: "a", date: "2026-11-18", amount: 0, attendance: "cancelo" }];
    const kinds = runChecks([base], sessions, [], new Date(2026, 10, 25)).map((i) => i.kind);
    expect(kinds).not.toContain("sesion-sin-costo");
  });

  it("al importar, 'no' en Asistencia se marca como falta conservando el monto", () => {
    const header: RawCell[] = ["Numero de sesión", "Fecha de sesión", "Costo de sesión", "Pagado", "Pendiente", "Total pagado", "Fecha de pago", "Total pendiente", "Total real", "Forma de pago", "Asistencia"];
    const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
    const preview = parseWorkbook([
      { name: "Paciente", rows: [header, [1, d("2026-08-04"), null, 600, null, null, null, null, null, null, "no"], [2, d("2026-08-11"), null, 600, null, null, null, null, null, null, "si"]] },
    ]);
    const { data } = applyImport(preview.patients, { patients: [], sessions: [], payments: [] });
    expect(data.sessions.map((s) => [s.attendance ?? "asistio", s.amount])).toEqual([
      ["falto", 600],
      ["asistio", 600],
    ]);
  });
});

describe("agenda semanal", () => {
  it("la semana empieza en lunes", () => {
    expect(startOfWeek("2026-11-25")).toBe("2026-11-23"); // miércoles → lunes
    expect(startOfWeek("2026-11-29")).toBe("2026-11-23"); // domingo → lunes anterior
  });

  it("muestra la sesión esperada por horario y la registrada en su lugar", () => {
    const sessions: Session[] = [{ id: "s", patientId: "a", date: "2026-11-18", amount: 600 }];
    const prev = agendaWeek("2026-11-16", [base], sessions, []);
    const wed = prev.find((d) => d.date === "2026-11-18")!;
    expect(wed.items).toHaveLength(1);
    expect(wed.items[0].session?.id).toBe("s");
    expect(wed.items[0].time).toBe("17:00");

    const week = agendaWeek("2026-11-23", [base], sessions, []);
    const expected = week.find((d) => d.date === "2026-11-25")!;
    expect(expected.items).toHaveLength(1);
    expect(expected.items[0].session).toBeUndefined();
  });

  it("no espera sesiones en vacaciones ni de quien ya dejó de venir", () => {
    const vacation = [{ id: "v", start: "2026-11-24", end: "2026-11-30" }];
    const week = agendaWeek("2026-11-23", [base], [], vacation);
    expect(week.find((d) => d.date === "2026-11-25")!.onVacation).toBe(true);
    expect(week.flatMap((d) => d.items)).toHaveLength(0);

    const ended = { ...base, status: "inactivo" as const, endDate: "2026-11-01" };
    expect(agendaWeek("2026-11-23", [ended], [], []).flatMap((d) => d.items)).toHaveLength(0);
  });

  it("a un paciente quincenal no lo espera la semana siguiente a su sesión", () => {
    const quincenal = { ...base, sessionFrequency: "quincenal" as const };
    const sessions: Session[] = [{ id: "s", patientId: "a", date: "2026-11-18", amount: 600 }];
    expect(agendaWeek("2026-11-23", [quincenal], sessions, []).flatMap((d) => d.items)).toHaveLength(0);
    expect(agendaWeek("2026-11-30", [quincenal], sessions, []).flatMap((d) => d.items)).toHaveLength(1);
  });
});
