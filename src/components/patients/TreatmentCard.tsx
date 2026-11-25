"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { formatDate, todayIso } from "@/lib/format";
import {
  endTreatmentPatch,
  isCurrentlyActive,
  lastSessionDate,
  resumeTreatmentPatch,
} from "@/lib/treatment";
import type { Patient } from "@/lib/types";

/**
 * Casilla "Ya no viene a terapia": al marcarla se pide desde cuándo, y el
 * paciente deja de aparecer en los cortes de los meses siguientes. Si
 * regresa, se desmarca indicando la fecha de regreso y el periodo anterior
 * queda en su historial.
 */
export function TreatmentCard({ patient }: { patient: Patient }) {
  const { sessions, updatePatient } = useClinicData();
  const active = isCurrentlyActive(patient);
  const last = lastSessionDate(patient.id, sessions);
  const [dialog, setDialog] = useState<"baja" | "regreso" | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(kind: "baja" | "regreso") {
    setDate(kind === "baja" ? (last ?? todayIso()) : todayIso());
    setError(null);
    setDialog(kind);
  }

  function confirm() {
    if (!date) {
      setError("Indica la fecha.");
      return;
    }
    if (dialog === "baja") {
      if (date < patient.startDate) {
        setError("La fecha no puede ser anterior al inicio del tratamiento.");
        return;
      }
      updatePatient(patient.id, endTreatmentPatch(date));
    } else {
      if (patient.endDate && date < patient.endDate) {
        setError("El regreso debe ser después de la fecha en que dejó de venir.");
        return;
      }
      updatePatient(patient.id, resumeTreatmentPatch(patient, date));
    }
    setDialog(null);
  }

  const later = patient.endDate ? sessions.filter((s) => s.patientId === patient.id && s.date > patient.endDate!) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tratamiento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={!active} onChange={() => open(active ? "baja" : "regreso")} />
          <span className="font-medium">Ya no viene a terapia</span>
        </label>
        {active ? (
          <p className="text-dark/65">
            En tratamiento desde el {formatDate(patient.startDate)}.
            {last ? ` Última sesión: ${formatDate(last)}.` : ""}
          </p>
        ) : (
          <p className="text-dark/65">
            Dejó de venir el {patient.endDate ? formatDate(patient.endDate) : "—"}. Ya no aparece en los cortes de los
            meses siguientes; si quedó a deber, el adeudo sigue visible en Cobros.
          </p>
        )}
        {later.length > 0 ? (
          <p className="text-orange-accent">
            Tiene {later.length} {later.length === 1 ? "sesión registrada" : "sesiones registradas"} después de esa
            fecha. Si regresó, desmarca la casilla.
          </p>
        ) : null}
        {patient.pastPeriods && patient.pastPeriods.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wideish text-dark/55">Periodos anteriores</p>
            <ul className="mt-1 text-dark/65">
              {patient.pastPeriods.map((p) => (
                <li key={`${p.start}-${p.end}`}>
                  {formatDate(p.start)} — {formatDate(p.end)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog === "baja" ? `¿Desde cuándo ya no viene ${patient.name}?` : `${patient.name} regresó a terapia`}
        description={
          dialog === "baja"
            ? "Usa la fecha de su última sesión. Desde el mes siguiente dejará de aparecer en los cortes mensuales; su historial y sus adeudos se conservan."
            : "El periodo anterior se guarda en su historial y vuelve a aparecer en los cortes desde esta fecha."
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={dialog === "baja" ? "Dejó de venir el" : "Volvió a iniciar el"} required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          {error ? <p className="text-sm text-orange-accent">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={confirm}>{dialog === "baja" ? "Marcar que ya no viene" : "Reactivar"}</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
