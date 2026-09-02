"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useClinicData } from "@/components/providers/ClinicDataProvider";

const todayIso = () => new Date().toISOString().slice(0, 10);

// Crea UNA sesión puntual. Nunca se dispara por la frecuencia del paciente —
// eso es solo informativo (ver punto 8 de las indicaciones del producto).
export function NewSessionModal({
  open,
  onClose,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  patientId?: string;
}) {
  const { patients, addSession } = useClinicData();
  const [selectedPatientId, setSelectedPatientId] = useState(patientId ?? "");
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patient = patients.find((p) => p.id === selectedPatientId);

  function handlePatientChange(id: string) {
    setSelectedPatientId(id);
    if (!amountTouched) {
      const p = patients.find((pp) => pp.id === id);
      setAmount(p ? String(p.costPerSession) : "");
    }
  }

  function reset() {
    setSelectedPatientId(patientId ?? "");
    setDate(todayIso());
    setAmount("");
    setAmountTouched(false);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit() {
    const amountNum = Number(amount);
    if (!selectedPatientId) {
      setError("Selecciona un paciente.");
      return;
    }
    if (!date) {
      setError("Ingresa la fecha de la sesión.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Ingresa un costo válido para esta sesión.");
      return;
    }
    setError(null);
    addSession({ patientId: selectedPatientId, date, amount: amountNum });
    handleClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nueva sesión"
      description="Registra una sesión puntual. La frecuencia del paciente es solo informativa: no crea sesiones por sí sola."
    >
      <div className="flex flex-col gap-4">
        <FormField label="Paciente" required>
          <Select
            value={selectedPatientId}
            onChange={(e) => handlePatientChange(e.target.value)}
            disabled={Boolean(patientId)}
          >
            <option value="">Selecciona un paciente…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Fecha" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField
            label="Costo de esta sesión"
            hint={patient ? `Tarifa actual del paciente: ${patient.costPerSession} ${patient.currency}` : undefined}
            required
          >
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountTouched(true);
              }}
              placeholder="1000"
            />
          </FormField>
        </div>

        {error ? <p className="text-sm text-orange-accent">{error}</p> : null}

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Guardar sesión</Button>
        </div>
      </div>
    </Modal>
  );
}
