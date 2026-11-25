"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { todayIso } from "@/lib/format";
import type { NewPatientInput } from "@/components/providers/ClinicDataProvider";
import {
  paymentModalityLabels,
  patientStatusLabels,
  sessionFrequencyLabels,
  type Currency,
  type PatientStatus,
  type PaymentModality,
  type SessionFrequency,
  type WeeklySlot,
  weekdayLabels,
} from "@/lib/types";


export function PatientForm({
  onSubmit,
  onCancel,
  initial,
  submitLabel = "Guardar paciente",
}: {
  onSubmit: (input: NewPatientInput) => void;
  onCancel: () => void;
  /** Valores actuales, para editar un paciente existente. */
  initial?: NewPatientInput;
  submitLabel?: string;
}) {
  const formId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayIso());
  const [status, setStatus] = useState<PatientStatus>(initial?.status ?? "activo");
  const [sessionFrequency, setSessionFrequency] = useState<SessionFrequency>(
    initial?.sessionFrequency ?? "semanal-1"
  );
  const [paymentModality, setPaymentModality] = useState<PaymentModality>(initial?.paymentModality ?? "mensual");
  const [costPerSession, setCostPerSession] = useState(
    initial && initial.costPerSession > 0 ? String(initial.costPerSession) : ""
  );
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "MXN");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [adminNotes, setAdminNotes] = useState(initial?.adminNotes ?? "");
  const [schedule, setSchedule] = useState<WeeklySlot[]>(initial?.schedule ?? []);
  const [sessionMinutes, setSessionMinutes] = useState(String(initial?.sessionMinutes ?? 50));
  const [meetingUrl, setMeetingUrl] = useState(initial?.meetingUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cost = Number(costPerSession);
    if (!name.trim()) {
      setError("El nombre del paciente es obligatorio.");
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      setError("El costo por sesión debe ser un número mayor a $0.");
      return;
    }

    const minutes = Number(sessionMinutes);
    if (schedule.some((slot) => !/^\d{2}:\d{2}$/.test(slot.time))) {
      setError("Completa la hora de cada día del horario.");
      return;
    }
    if (meetingUrl.trim() && !/^https?:\/\//i.test(meetingUrl.trim())) {
      setError("El enlace de videollamada debe empezar con https://");
      return;
    }

    onSubmit({
      ...initial,
      name: name.trim(),
      startDate,
      status,
      sessionFrequency,
      paymentModality,
      costPerSession: cost,
      currency,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      adminNotes: adminNotes.trim() || undefined,
      schedule: schedule.length > 0 ? schedule : undefined,
      sessionMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : undefined,
      meetingUrl: meetingUrl.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Nombre" htmlFor={`${formId}-name`} required>
        <Input
          id={`${formId}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre completo del paciente"
          autoFocus={!initial}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Fecha de inicio de tratamiento" htmlFor={`${formId}-start`} required>
          <Input
            id={`${formId}-start`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </FormField>

        <FormField
          label="Estado"
          htmlFor={`${formId}-status`}
          required
          hint={
            status === "inactivo"
              ? "Para reactivarlo usa la casilla “Ya no viene a terapia” en su ficha."
              : "Si deja de venir, márcalo en su ficha con la casilla “Ya no viene a terapia”."
          }
        >
          <Select
            id={`${formId}-status`}
            value={status}
            disabled={status === "inactivo"}
            onChange={(e) => setStatus(e.target.value as PatientStatus)}
          >
            {Object.entries(patientStatusLabels)
              .filter(([value]) => value !== "inactivo" || status === "inactivo")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Frecuencia de sesiones"
          htmlFor={`${formId}-frequency`}
          hint="Cada cuánto suele tener sesiones. No crea sesiones automáticamente."
          required
        >
          <Select
            id={`${formId}-frequency`}
            value={sessionFrequency}
            onChange={(e) => setSessionFrequency(e.target.value as SessionFrequency)}
          >
            {Object.entries(sessionFrequencyLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Modalidad de pago"
          htmlFor={`${formId}-modality`}
          hint="Cómo acostumbra pagar. Es independiente de la frecuencia."
          required
        >
          <Select
            id={`${formId}-modality`}
            value={paymentModality}
            onChange={(e) => setPaymentModality(e.target.value as PaymentModality)}
          >
            {Object.entries(paymentModalityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Costo por sesión"
          htmlFor={`${formId}-cost`}
          hint="Costo de UNA sesión individual, no del periodo de pago."
          required
        >
          <Input
            id={`${formId}-cost`}
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            value={costPerSession}
            onChange={(e) => setCostPerSession(e.target.value)}
            placeholder="1000"
          />
        </FormField>

        <FormField label="Moneda" htmlFor={`${formId}-currency`} required>
          <Select
            id={`${formId}-currency`}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            <option value="MXN">MXN — Peso mexicano</option>
            <option value="USD">USD — Dólar</option>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Correo (opcional)" htmlFor={`${formId}-email`}>
          <Input
            id={`${formId}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
          />
        </FormField>
        <FormField label="Teléfono (opcional)" htmlFor={`${formId}-phone`}>
          <Input
            id={`${formId}-phone`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="55 0000 0000"
          />
        </FormField>
      </div>

      <FormField
        label="Horario habitual (opcional)"
        hint="Sirve para llenar las sesiones del mes con un clic y para agregarlas a Google Calendar. No crea sesiones por sí solo."
      >
        <div className="flex flex-col gap-2">
          {schedule.map((slot, i) => (
            <div key={i} className="flex gap-2">
              <Select
                aria-label={`Día ${i + 1}`}
                value={slot.weekday}
                onChange={(e) =>
                  setSchedule(schedule.map((s, j) => (j === i ? { ...s, weekday: Number(e.target.value) } : s)))
                }
              >
                {weekdayLabels.map((label, day) => (
                  <option key={day} value={day}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input
                aria-label={`Hora ${i + 1}`}
                type="time"
                value={slot.time}
                onChange={(e) => setSchedule(schedule.map((s, j) => (j === i ? { ...s, time: e.target.value } : s)))}
              />
              <Button
                type="button"
                variant="ghost"
                aria-label="Quitar día"
                onClick={() => setSchedule(schedule.filter((_, j) => j !== i))}
              >
                ✕
              </Button>
            </div>
          ))}
          <button
            type="button"
            className="self-start text-sm text-blue-accent"
            onClick={() =>
              setSchedule([...schedule, { weekday: schedule[schedule.length - 1]?.weekday ?? 1, time: schedule[schedule.length - 1]?.time ?? "17:00" }])
            }
          >
            + Agregar día y hora
          </button>
        </div>
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Duración de la sesión (min)" htmlFor={`${formId}-minutes`}>
          <Input
            id={`${formId}-minutes`}
            type="number"
            min={10}
            step="5"
            value={sessionMinutes}
            onChange={(e) => setSessionMinutes(e.target.value)}
          />
        </FormField>
        <FormField label="Enlace de videollamada (opcional)" htmlFor={`${formId}-meeting`} hint="Zoom, Google Meet, etc.">
          <Input
            id={`${formId}-meeting`}
            type="url"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="https://zoom.us/j/…"
          />
        </FormField>
      </div>

      <FormField label="Notas administrativas (opcional)" htmlFor={`${formId}-notes`}>
        <Textarea
          id={`${formId}-notes`}
          rows={3}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Notas internas sobre el paciente, sin uso clínico."
        />
      </FormField>

      {error ? <p className="text-sm text-orange-accent">{error}</p> : null}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
