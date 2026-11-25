"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { formatDate, todayIso } from "@/lib/format";
import { isOnVacation, vacationLength } from "@/lib/vacations";
import type { Vacation } from "@/lib/types";

/**
 * Vacaciones propias (o cualquier periodo sin consulta). Aparecen marcadas
 * en el corte anual para explicar los meses con menos ingresos, no se llenan
 * sesiones en esos días desde el horario, y Revisión avisa si se registró
 * alguna sesión dentro de ellas.
 */
export default function VacacionesPage() {
  const { vacations, addVacation, deleteVacation, sessions } = useClinicData();
  const [start, setStart] = useState(todayIso());
  const [end, setEnd] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Vacation | null>(null);
  const today = todayIso();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!start || !end) {
      setError("Indica la fecha de inicio y de regreso.");
      return;
    }
    if (end < start) {
      setError("El último día no puede ser anterior al primero.");
      return;
    }
    if (vacations.some((v) => v.start <= end && start <= v.end)) {
      setError("Se empalma con otras vacaciones que ya registraste.");
      return;
    }
    setError(null);
    addVacation({ start, end, note: note.trim() || undefined });
    setNote("");
  }

  const upcoming = vacations.filter((v) => v.end >= today);
  const past = vacations.filter((v) => v.end < today).reverse();

  function row(v: Vacation) {
    const days = vacationLength(v);
    const sessionsInside = sessions.filter((s) => isOnVacation([v], s.date)).length;
    const current = v.start <= today && today <= v.end;
    return (
      <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
        <div>
          <p className="text-sm font-medium text-dark">
            {formatDate(v.start)} — {formatDate(v.end)}
            {current ? <span className="ml-2 text-xs text-blue-accent">Ahora</span> : null}
          </p>
          <p className="text-sm text-dark/60">
            {days} {days === 1 ? "día" : "días"}
            {v.note ? ` · ${v.note}` : ""}
            {sessionsInside > 0
              ? ` · ${sessionsInside} ${sessionsInside === 1 ? "sesión registrada" : "sesiones registradas"} en esas fechas`
              : ""}
          </p>
        </div>
        <button type="button" className="text-sm text-dark/55 hover:text-dark" onClick={() => setToDelete(v)}>
          Quitar
        </button>
      </li>
    );
  }

  return (
    <AppShell
      title="Vacaciones"
      description="Tus días sin consulta. Se marcan en el corte anual para que veas por qué un mes vino más bajo."
    >
      <div className="grid max-w-4xl grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Registrar vacaciones</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-4">
              <FormField label="Primer día" required>
                <Input id="vac-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </FormField>
              <FormField label="Último día" required>
                <Input id="vac-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </FormField>
              <FormField label="Nota (opcional)">
                <Input
                  id="vac-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej. Fin de año"
                />
              </FormField>
              <Button type="submit">Agregar</Button>
            </form>
            {error ? <p className="mt-3 text-sm text-orange-accent">{error}</p> : null}
          </CardContent>
        </Card>

        {vacations.length === 0 ? (
          <EmptyState
            title="Sin vacaciones registradas"
            description="Cuando registres unas, aparecerán marcadas en las gráficas del corte anual."
          />
        ) : (
          <>
            {upcoming.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Próximas</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="divide-y divide-dark/10">{upcoming.map(row)}</ul>
                </CardContent>
              </Card>
            ) : null}
            {past.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Anteriores</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="divide-y divide-dark/10">{past.map(row)}</ul>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>

      <ConfirmModal
        open={toDelete !== null}
        title="¿Quitar estas vacaciones?"
        message={
          toDelete ? `Se quitarán las vacaciones del ${formatDate(toDelete.start)} al ${formatDate(toDelete.end)}.` : ""
        }
        confirmLabel="Quitar"
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteVacation(toDelete.id);
        }}
      />
    </AppShell>
  );
}
