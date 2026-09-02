"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { DuplicateWarning } from "@/components/payments/DuplicateWarning";
import { ReceiptTab } from "@/components/payments/ReceiptTab";
import { SessionPicker } from "@/components/payments/SessionPicker";
import { cn } from "@/lib/cn";
import { hasUnpaidSessions } from "@/lib/metrics";
import type { PaymentMethod } from "@/lib/types";

const methods: PaymentMethod[] = ["Transferencia", "Efectivo", "Tarjeta", "Otro"];

const todayIso = () => new Date().toISOString().slice(0, 10);

export function PaymentModal({
  open,
  onClose,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  patientId?: string;
}) {
  const { patients, sessions, payments, registerPayment, findPossibleDuplicates } = useClinicData();
  const [tab, setTab] = useState<"manual" | "comprobante">("manual");

  const [selectedPatientId, setSelectedPatientId] = useState(patientId ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const patient = patients.find((p) => p.id === selectedPatientId);

  const duplicates = useMemo(() => {
    const amountNum = Number(amount);
    if (!selectedPatientId || !date || !Number.isFinite(amountNum) || amountNum <= 0) return [];
    return findPossibleDuplicates({
      patientId: selectedPatientId,
      amount: amountNum,
      date,
      reference: reference || undefined,
    });
  }, [selectedPatientId, amount, date, reference, findPossibleDuplicates]);

  function reset() {
    setTab("manual");
    setSelectedPatientId(patientId ?? "");
    setAmount("");
    setDate(todayIso());
    setReference("");
    setMethod("");
    setSessionIds([]);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleManualSubmit() {
    const amountNum = Number(amount);
    if (!selectedPatientId) {
      setError("Selecciona un paciente.");
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (!date) {
      setError("Ingresa la fecha de pago.");
      return;
    }
    if (sessionIds.length === 0 && hasUnpaidSessions(selectedPatientId, sessions, payments)) {
      setError("Selecciona a qué sesión(es) pendientes corresponde este pago.");
      return;
    }
    setError(null);
    registerPayment({
      patientId: selectedPatientId,
      amount: amountNum,
      date,
      reference: reference || undefined,
      method: method || undefined,
      sessionIds,
      source: "manual",
    });
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Registrar pago" widthClassName="max-w-2xl">
      <div className="mb-5 flex gap-1 border-b border-dark/10">
        <TabButton active={tab === "manual"} onClick={() => setTab("manual")}>
          Manual
        </TabButton>
        <TabButton active={tab === "comprobante"} onClick={() => setTab("comprobante")}>
          Comprobante
        </TabButton>
      </div>

      {tab === "manual" ? (
        <div className="flex flex-col gap-4">
          <FormField label="Paciente" required>
            <Select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setSessionIds([]);
              }}
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
            <FormField label="Monto" required>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
              />
            </FormField>
            <FormField label="Fecha de pago" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Referencia (opcional)">
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Folio o clave de rastreo"
              />
            </FormField>
            <FormField label="Método de pago (opcional)">
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

          {selectedPatientId ? (
            <FormField
              label="Aplicar a sesión(es)"
              hint="Elige a qué sesiones pendientes corresponde este pago."
            >
              <SessionPicker
                patientId={selectedPatientId}
                sessions={sessions}
                payments={payments}
                currency={patient?.currency ?? "MXN"}
                selected={sessionIds}
                onChange={setSessionIds}
              />
            </FormField>
          ) : null}

          <DuplicateWarning matches={duplicates} currency={patient?.currency ?? "MXN"} />

          {error ? <p className="text-sm text-orange-accent">{error}</p> : null}

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleManualSubmit}>
              {duplicates.length > 0 ? "Registrar de todas formas" : "Registrar pago"}
            </Button>
          </div>
        </div>
      ) : (
        <ReceiptTab patientIdLocked={patientId} onDone={handleClose} onCancel={handleClose} />
      )}
    </Modal>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
        active ? "border-blue-accent text-dark" : "border-transparent text-dark/50 hover:text-dark"
      )}
    >
      {children}
    </button>
  );
}
