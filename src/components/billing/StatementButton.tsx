"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { downloadBlob } from "@/lib/download";
import { formatCurrency } from "@/lib/format";
import { availableYears } from "@/lib/metrics";
import {
  buildStatementPdf,
  statementData,
  statementFilename,
  type StatementScope,
} from "@/lib/statement-pdf";
import type { Patient } from "@/lib/types";

/** Estado de cuenta del paciente en PDF, para enviárselo cuando lo pida. */
export function StatementButton({ patient }: { patient: Patient }) {
  const { sessions, payments, profile } = useClinicData();
  const [open, setOpen] = useState(false);
  const [scopeKey, setScopeKey] = useState("pendientes");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const years = availableYears(sessions.filter((s) => s.patientId === patient.id)).filter((y) =>
    sessions.some((s) => s.patientId === patient.id && s.date.startsWith(`${y}-`))
  );

  const scope: StatementScope =
    scopeKey === "pendientes"
      ? { kind: "pendientes" }
      : scopeKey === "todo"
        ? { kind: "todo" }
        : { kind: "anio", year: Number(scopeKey) };
  const data = statementData(patient, sessions, payments, scope);

  async function download() {
    setBusy(true);
    setStatus(null);
    try {
      const blob = await buildStatementPdf(patient, data, profile);
      const result = await downloadBlob(blob, statementFilename(patient, scope));
      setStatus(result === "ok" ? null : result === "cancelled" ? "Descarga cancelada." : "No se pudo descargar aquí.");
      if (result === "ok") setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Estado de cuenta
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Estado de cuenta de ${patient.name}`}
        description="Se genera un PDF con las sesiones, lo pagado, lo pendiente y tus datos para pago (de Ajustes)."
      >
        <div className="flex flex-col gap-4 text-sm">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wideish text-dark/60">Periodo</legend>
            {[
              ["pendientes", "Solo lo pendiente de pago"],
              ...years.map((y) => [String(y), `Año ${y}`]),
              ["todo", "Todo el historial"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="statement-scope"
                  className="accent-blue-accent"
                  checked={scopeKey === value}
                  onChange={() => setScopeKey(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <p className="text-dark/65">
            {data.rows.length} {data.rows.length === 1 ? "sesión" : "sesiones"} · pagado{" "}
            {formatCurrency(data.totals.paid, patient.currency)} · pendiente{" "}
            {formatCurrency(data.totals.pending, patient.currency)}
          </p>
          {!profile?.paymentDetails ? (
            <p className="text-xs text-dark/55">
              Tip: agrega tus datos para pago en Ajustes para que aparezcan en el estado de cuenta.
            </p>
          ) : null}
          {status ? <p className="text-orange-accent">{status}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={download} disabled={busy}>
              {busy ? "Generando…" : "Descargar PDF"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
