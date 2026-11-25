"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { DEFAULT_SESSION_MINUTES, describeSchedule, googleCalendarLinks } from "@/lib/calendar";
import { isCurrentlyActive } from "@/lib/treatment";
import type { Patient } from "@/lib/types";

/** Horario del paciente con botón para crear el evento recurrente en Google Calendar. */
export function ScheduleCard({ patient }: { patient: Patient }) {
  // La zona horaria solo se conoce en el navegador.
  const [timeZone, setTimeZone] = useState<string | null>(null);
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  const hasSchedule = (patient.schedule?.length ?? 0) > 0;
  const links = timeZone && hasSchedule && isCurrentlyActive(patient) ? googleCalendarLinks(patient, timeZone) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0 text-sm">
        <p className="text-dark">{describeSchedule(patient)}</p>
        {hasSchedule ? (
          <p className="text-dark/60">{patient.sessionMinutes ?? DEFAULT_SESSION_MINUTES} minutos por sesión</p>
        ) : (
          <p className="text-dark/55">Agrégalo con “Editar paciente” para llenar sus sesiones del mes con un clic.</p>
        )}
        {patient.meetingUrl ? (
          <a href={patient.meetingUrl} target="_blank" rel="noreferrer" className="truncate text-blue-accent">
            Abrir videollamada ↗
          </a>
        ) : null}
        {links.map(({ group, url }) => (
          <a key={group.time} href={url} target="_blank" rel="noreferrer" className="text-blue-accent">
            Agregar a Google Calendar{links.length > 1 ? ` (${group.time})` : ""} ↗
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
