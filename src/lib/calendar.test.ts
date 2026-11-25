import { describe, expect, it } from "vitest";
import { buildIcs, describeSchedule, googleCalendarLinks, scheduleDates, slotGroups } from "@/lib/calendar";
import type { Patient } from "@/lib/types";

const patient: Patient = {
  id: "a",
  name: "Paciente Prueba",
  startDate: "2026-01-05",
  status: "activo",
  sessionFrequency: "semanal-2",
  paymentModality: "mensual",
  costPerSession: 700,
  currency: "MXN",
  schedule: [
    { weekday: 4, time: "17:00" },
    { weekday: 2, time: "17:00" },
    { weekday: 6, time: "10:30" },
  ],
  sessionMinutes: 50,
  meetingUrl: "https://zoom.us/j/123",
};

describe("calendario", () => {
  it("agrupa días con la misma hora", () => {
    expect(slotGroups(patient.schedule)).toEqual([
      { time: "10:30", weekdays: [6] },
      { time: "17:00", weekdays: [2, 4] },
    ]);
    expect(describeSchedule(patient)).toBe("sábado 10:30 · martes y jueves 17:00");
  });

  it("genera las fechas del horario en un rango", () => {
    // noviembre 2026: martes 3,10,17,24 · jueves 5,12,19,26 · sábado 7,14,21,28
    expect(scheduleDates(patient.schedule, "2026-11-01", "2026-11-12")).toEqual([
      "2026-11-03",
      "2026-11-05",
      "2026-11-07",
      "2026-11-10",
      "2026-11-12",
    ]);
  });

  it("arma el enlace de Google Calendar con recurrencia y videollamada", () => {
    const links = googleCalendarLinks(patient, "America/Mexico_City", "2026-11-25");
    expect(links).toHaveLength(2);
    const url = new URL(links[1].url);
    expect(url.searchParams.get("dates")).toBe("20261126T170000/20261126T175000");
    expect(url.searchParams.get("recur")).toBe("RRULE:FREQ=WEEKLY;BYDAY=TU,TH");
    expect(url.searchParams.get("location")).toBe("https://zoom.us/j/123");
  });

  it("usa intervalo de 2 semanas para pacientes quincenales", () => {
    const links = googleCalendarLinks({ ...patient, sessionFrequency: "quincenal" }, "America/Mexico_City", "2026-11-25");
    expect(new URL(links[0].url).searchParams.get("recur")).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SA");
  });

  it("genera un .ics válido", () => {
    const ics = buildIcs([patient], "America/Mexico_City", "2026-11-25");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART;TZID=America/Mexico_City:20261128T103000");
    expect(ics).toContain("SUMMARY:Sesión — Paciente Prueba");
  });
});
