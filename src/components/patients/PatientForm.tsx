"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { NewPatientInput } from "@/components/providers/ClinicDataProvider";
import {
  paymentModalityLabels,
  patientStatusLabels,
  sessionFrequencyLabels,
  type Currency,
  type PatientStatus,
  type PaymentModality,
  type SessionFrequency,
} from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

export function PatientForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: NewPatientInput) => void;
  onCancel: () => void;
}) {
  const formId = useId();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [status, setStatus] = useState<PatientStatus>("activo");
  const [sessionFrequency, setSessionFrequency] = useState<SessionFrequency>("semanal-1");
  const [paymentModality, setPaymentModality] = useState<PaymentModality>("mensual");
  const [costPerSession, setCostPerSession] = useState("");
  const [currency, setCurrency] = useState<Currency>("MXN");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
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

    onSubmit({
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
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Fecha de inicio de tratamiento" htmlFor={`${formId}-start`} required>
          <Input
            id={`${formId}-start`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </FormField>

        <FormField label="Estado" htmlFor={`${formId}-status`} required>
          <Select
            id={`${formId}-status`}
            value={status}
            onChange={(e) => setStatus(e.target.value as PatientStatus)}
          >
            {Object.entries(patientStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
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
        <Button type="submit">Guardar paciente</Button>
      </div>
    </form>
  );
}
