"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { PatientOptions } from "@/components/patients/PatientOptions";
import { describeSchedule, scheduleDates } from "@/lib/calendar";
import { formatCurrency, formatDate, todayIso } from "@/lib/format";
import { monthLabel } from "@/lib/metrics";
import { isCurrentlyActive } from "@/lib/treatment";
import { isOnVacation } from "@/lib/vacations";
import type { PaymentMethod } from "@/lib/types";

const methods: PaymentMethod[] = ["Transferencia", "Efectivo", "Tarjeta", "Otro"];

/**
 * Registra una o varias sesiones a la vez (p. ej. todas las del mes) y,
 * opcionalmente, el pago que las cubre — el equivalente a llenar varias
 * filas del Excel con Fecha, Costo y Pagado de un solo golpe. Nunca se
 * crean sesiones por la frecuencia del paciente: cada fecha la elige la
 * persona (ver punto 8 de las indicaciones del producto).
 */
export function NewSessionModal({
  open,
  onClose,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  patientId?: string;
}) {
  const { patients, sessions, vacations, addSessions, registerPayment } = useClinicData();
  const [selectedPatientId, setSelectedPatientId] = useState(patientId ?? "");
  const [dates, setDates] = useState<string[]>([todayIso()]);
  const [amount, setAmount] = useState(() => {
    const p = patients.find((pp) => pp.id === patientId);
    return p && p.costPerSession > 0 ? String(p.costPerSession) : "";
  });
  const [amountTouched, setAmountTouched] = useState(false);
  const [note, setNote] = useState("");
  const [paid, setPaid] = useState(false);
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [error, setError] = useState<string | null>(null);

  const patient = patients.find((p) => p.id === selectedPatientId);
  const amountNum = Number(amount);
  const validDates = dates.filter(Boolean);
  const total = Number.isFinite(amountNum) ? amountNum * validDates.length : 0;

  const repeated = useMemo(() => {
    const existing = new Set(sessions.filter((s) => s.patientId === selectedPatientId).map((s) => s.date));
    const seen = new Set<string>();
    const result: string[] = [];
    for (const d of validDates) {
      if (existing.has(d) || seen.has(d)) result.push(d);
      seen.add(d);
    }
    return result;
  }, [sessions, selectedPatientId, validDates]);

  const afterEnd = patient?.endDate ? validDates.filter((d) => d > patient.endDate!) : [];

  /** Llena las fechas con el horario del paciente en un mes, sin repetir sesiones ya registradas. */
  function fillFromSchedule(monthOffset: 0 | -1) {
    if (!patient) return;
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const last = monthOffset === 0 ? now : new Date(now.getFullYear(), now.getMonth(), 0);
    let from = todayIso(first);
    let to = todayIso(last);
    if (patient.startDate > from) from = patient.startDate;
    if (patient.endDate && patient.endDate < to) to = patient.endDate;
    const existing = new Set(sessions.filter((s) => s.patientId === patient.id).map((s) => s.date));
    const candidates = scheduleDates(patient.schedule, from, to).filter((d) => !existing.has(d));
    const filled = candidates.filter((d) => !isOnVacation(vacations, d));
    const skippedForVacation = candidates.length - filled.length;
    if (filled.length === 0) {
      setError(`No hay fechas pendientes de registrar en ${monthLabel(todayIso(first).slice(0, 7)).toLowerCase()} según su horario.`);
      return;
    }
    setError(
      skippedForVacation > 0
        ? `Se omitieron ${skippedForVacation} ${skippedForVacation === 1 ? "fecha" : "fechas"} que caen en tus vacaciones.`
        : null
    );
    setDates(filled);
  }

  function handlePatientChange(id: string) {
    setSelectedPatientId(id);
    if (!amountTouched) {
      const p = patients.find((pp) => pp.id === id);
      setAmount(p && p.costPerSession > 0 ? String(p.costPerSession) : "");
    }
  }

  function addDate() {
    const last = validDates[validDates.length - 1];
    if (!last) {
      setDates([...dates, todayIso()]);
      return;
    }
    // Sugiere la misma fecha una semana después; la persona la ajusta.
    const [y, m, d] = last.split("-").map(Number);
    setDates([...dates, todayIso(new Date(y, m - 1, d + 7))]);
  }

  function reset() {
    setSelectedPatientId(patientId ?? "");
    setDates([todayIso()]);
    setAmountTouched(false);
    setNote("");
    setPaid(false);
    setPaymentDate(todayIso());
    setMethod("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!selectedPatientId) {
      setError("Selecciona un paciente.");
      return;
    }
    if (validDates.length === 0) {
      setError("Agrega al menos una fecha.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum < 0 || amount === "") {
      setError("Ingresa el costo de cada sesión (0 si fue gratuita).");
      return;
    }
    if (paid && !paymentDate) {
      setError("Ingresa la fecha en que te pagaron.");
      return;
    }
    setError(null);
    const created = addSessions(
      [...validDates].sort().map((date) => ({
        patientId: selectedPatientId,
        date,
        amount: amountNum,
        note: note.trim() || undefined,
      }))
    );
    if (paid && total > 0) {
      registerPayment({
        patientId: selectedPatientId,
        amount: total,
        date: paymentDate,
        method: method || undefined,
        sessionIds: created.map((s) => s.id),
        source: "manual",
      });
    }
    handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar sesiones"
      description="Una o varias sesiones del mismo paciente. Cada una cae automáticamente en el mes de su fecha."
      widthClassName="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        <FormField label="Paciente" required>
          <Select
            value={selectedPatientId}
            onChange={(e) => handlePatientChange(e.target.value)}
            disabled={Boolean(patientId)}
          >
            <option value="">Selecciona un paciente…</option>
            <PatientOptions patients={patients} />
          </Select>
        </FormField>

        {patient && (patient.schedule?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-dark/10 px-3 py-2 text-sm">
            <span className="text-dark/65">Horario: {describeSchedule(patient)}.</span>
            <button type="button" className="text-blue-accent" onClick={() => fillFromSchedule(0)}>
              Llenar este mes (hasta hoy)
            </button>
            <button type="button" className="text-blue-accent" onClick={() => fillFromSchedule(-1)}>
              Llenar el mes pasado
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={validDates.length > 1 ? "Fechas" : "Fecha"} required>
            <div className="flex flex-col gap-2">
              {dates.map((date, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="date"
                    value={date}
                    aria-label={`Fecha ${i + 1}`}
                    onChange={(e) => setDates(dates.map((d, j) => (j === i ? e.target.value : d)))}
                  />
                  {dates.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!h-10"
                      aria-label="Quitar fecha"
                      onClick={() => setDates(dates.filter((_, j) => j !== i))}
                    >
                      ✕
                    </Button>
                  ) : null}
                </div>
              ))}
              <button type="button" onClick={addDate} className="self-start text-sm text-blue-accent">
                + Agregar otra fecha
              </button>
            </div>
          </FormField>
          <div className="flex flex-col gap-4">
            <FormField
              label="Costo de cada sesión"
              hint={patient ? `Tarifa actual: ${formatCurrency(patient.costPerSession, patient.currency)}` : undefined}
              required
            >
              <Input
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountTouched(true);
                }}
                placeholder="700"
              />
            </FormField>
            <FormField label="Nota (opcional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. No asistió" />
            </FormField>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          Ya me {validDates.length > 1 ? "las" : "la"} pagaron
          {validDates.length > 0 && Number.isFinite(total) ? ` (${formatCurrency(total, patient?.currency)})` : ""}
        </label>

        {paid ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Fecha de pago" required>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </FormField>
            <FormField label="Método (opcional)">
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="">Sin especificar</option>
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        ) : (
          <p className="text-xs text-dark/50">Si no marcas el pago, quedarán como pendientes de cobro.</p>
        )}

        {patient && !isCurrentlyActive(patient) && afterEnd.length > 0 ? (
          <Alert variant="accent" title={`${patient.name} ya no viene desde el ${formatDate(patient.endDate!)}`}>
            Si regresó a terapia, reactívalo en su ficha (casilla “Ya no viene a terapia”) para que vuelva a aparecer
            en los cortes de cada mes.
          </Alert>
        ) : null}

        {repeated.length > 0 ? (
          <Alert variant="accent" title="Fecha repetida">
            {patient?.name ?? "Este paciente"} ya tiene sesión el {repeated.map(formatDate).join(", ")}. Si no
            tuvo dos sesiones ese día, quita la fecha para no duplicarla.
          </Alert>
        ) : null}

        {error ? <p className="text-sm text-orange-accent">{error}</p> : null}

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Guardar {validDates.length > 1 ? `${validDates.length} sesiones` : "sesión"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
