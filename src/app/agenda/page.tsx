"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AttendanceBadge } from "@/components/ui/AttendanceBadge";
import { SessionStatusBadge } from "@/components/ui/SessionStatusBadge";
import { EditSessionModal } from "@/components/sessions/EditSessionModal";
import { NewSessionButton } from "@/components/sessions/NewSessionButton";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { addDays, agendaWeek, startOfWeek, type AgendaItem } from "@/lib/agenda";
import { attendancePatch } from "@/lib/attendance";
import { cn } from "@/lib/cn";
import { formatDate, parseLocalDate, todayIso } from "@/lib/format";
import { sessionPaidMap, sessionStatus } from "@/lib/metrics";
import type { Attendance, Session } from "@/lib/types";

const dayFormatter = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "short" });

function dayLabel(iso: string): string {
  const label = dayFormatter.format(parseLocalDate(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type QuickAction = Attendance | "asistio-pagado";

const quickActions: [QuickAction, string][] = [
  ["asistio", "Asistió"],
  ["asistio-pagado", "Asistió y pagó"],
  ["falto", "Faltó sin avisar"],
  ["cancelo-tarde", "Canceló tarde"],
  ["cancelo", "Canceló con anticipación"],
];

/**
 * Agenda de la semana: las sesiones registradas y las que tocan según el
 * horario de cada paciente. Una sesión esperada se registra con un clic
 * (asistió, faltó, canceló…); nunca se registra sola.
 */
export default function AgendaPage() {
  const { patients, sessions, payments, vacations, profile, addSession, registerPayment } = useClinicData();
  const today = todayIso();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [editing, setEditing] = useState<Session | null>(null);

  const days = useMemo(
    () => agendaWeek(weekStart, patients, sessions, vacations),
    [weekStart, patients, sessions, vacations]
  );
  const paidMap = useMemo(() => sessionPaidMap(sessions, payments), [sessions, payments]);
  const items = days.flatMap((d) => d.items);
  const toRegister = items.filter((i) => !i.session && i.date <= today).length;
  const registered = items.filter((i) => i.session).length;
  const hasSchedules = patients.some((p) => (p.schedule?.length ?? 0) > 0);

  function register(item: AgendaItem, action: QuickAction) {
    const cost = item.patient.costPerSession;
    const attendance: Attendance = action === "asistio-pagado" ? "asistio" : action;
    const base = attendance === "asistio" ? { amount: cost } : attendancePatch({ amount: cost }, attendance, profile);
    const session = addSession({
      patientId: item.patient.id,
      date: item.date,
      attendance: attendance === "asistio" ? undefined : attendance,
      ...base,
    });
    if (action === "asistio-pagado" && cost > 0) {
      registerPayment({
        patientId: item.patient.id,
        amount: cost,
        date: today < item.date ? item.date : today,
        sessionIds: [session.id],
        source: "manual",
      });
    }
  }

  const weekEnd = addDays(weekStart, 6);

  return (
    <AppShell
      title="Agenda"
      description="Tu semana según el horario de cada paciente. Registra cada sesión con un clic."
      actions={<NewSessionButton>Registrar sesiones</NewSessionButton>}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ← Anterior
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(startOfWeek(today))}>
            Hoy
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Siguiente →
          </Button>
          <p className="ml-1 font-serif text-lg text-dark">
            {formatDate(weekStart)} — {formatDate(weekEnd)}
          </p>
        </div>
        <p className="text-sm text-dark/65">
          {registered} {registered === 1 ? "registrada" : "registradas"}
          {toRegister > 0 ? (
            <>
              {" · "}
              <span className="font-medium text-orange-accent">{toRegister} por registrar</span>
            </>
          ) : null}
        </p>
      </div>

      {!hasSchedules ? (
        <Card className="mb-5 px-5 py-4 text-sm text-dark/70">
          Ningún paciente tiene horario todavía. Agrégalo en la ficha de cada paciente (Editar paciente → Horario
          habitual) para que su sesión aparezca aquí cada semana.
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <Card key={day.date} className={cn("flex flex-col", isToday && "border-blue-accent/50")}>
              <div className="flex items-baseline justify-between gap-2 border-b border-dark/10 px-4 py-3">
                <p className={cn("text-sm font-semibold", isToday ? "text-blue-accent" : "text-dark")}>
                  {dayLabel(day.date)}
                </p>
                {day.onVacation ? <Badge variant="neutral">Vacaciones</Badge> : null}
              </div>
              <ul className="flex flex-1 flex-col divide-y divide-dark/10">
                {day.items.length === 0 ? (
                  <li className="px-4 py-3 text-xs text-dark/40">{day.onVacation ? "Sin consulta" : "Sin sesiones"}</li>
                ) : null}
                {day.items.map((item, i) => {
                  const s = item.session;
                  const paid = s ? Math.min(paidMap.get(s.id) ?? 0, s.amount) : 0;
                  const pendingRegister = !s && day.date <= today;
                  return (
                    <li key={`${item.patient.id}-${i}`} className="flex flex-col gap-1.5 px-4 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <Link
                          href={`/pacientes/${item.patient.id}`}
                          className="break-words text-sm font-medium leading-snug text-dark hover:text-blue-accent"
                        >
                          {item.patient.name}
                        </Link>
                        {item.time ? <span className="shrink-0 text-xs tabular-nums text-dark/55">{item.time}</span> : null}
                      </div>
                      {s ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {s.amount > 0 ? <SessionStatusBadge status={sessionStatus(s, paid)} /> : null}
                          <AttendanceBadge session={s} />
                          <button
                            type="button"
                            className="ml-auto text-xs text-blue-accent"
                            onClick={() => setEditing(s)}
                          >
                            Editar
                          </button>
                        </div>
                      ) : pendingRegister ? (
                        <select
                          aria-label={`Registrar sesión de ${item.patient.name}`}
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) register(item, e.target.value as QuickAction);
                          }}
                          className="h-8 w-full rounded border border-orange-accent/40 bg-background px-2 text-xs text-dark focus:border-blue-accent/60 focus:outline-none"
                        >
                          <option value="" disabled>
                            Registrar…
                          </option>
                          {quickActions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-dark/45">Programada</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!day.onVacation ? (
                <div className="border-t border-dark/10 px-4 py-2">
                  <NewSessionButton initialDate={day.date} variant="ghost" size="sm" className="!h-7 !px-0 text-xs text-blue-accent">
                    + Otra sesión
                  </NewSessionButton>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <EditSessionModal session={editing} onClose={() => setEditing(null)} />
    </AppShell>
  );
}
