"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Currency, Payment, PaymentMethod } from "@/lib/types";

const methods: PaymentMethod[] = ["Transferencia", "Efectivo", "Tarjeta", "Otro"];

/** Corrige monto, fecha, referencia o método de un pago, o lo elimina. */
export function EditPaymentModal({
  payment,
  currency,
  onClose,
}: {
  payment: Payment | null;
  currency: Currency;
  onClose: () => void;
}) {
  const { updatePayment, deletePayment, sessions } = useClinicData();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!payment) return;
    setAmount(String(payment.amount));
    setDate(payment.date);
    setReference(payment.reference ?? "");
    setMethod(payment.method ?? "");
    setError(null);
  }, [payment]);

  if (!payment) return null;
  const covered = sessions
    .filter((s) => payment.sessionIds.includes(s.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  function handleSave() {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Ingresa un monto mayor a $0.");
      return;
    }
    if (!date) {
      setError("Ingresa la fecha de pago.");
      return;
    }
    updatePayment(payment!.id, {
      amount: amountNum,
      date,
      reference: reference.trim() || undefined,
      method: method || undefined,
    });
    onClose();
  }

  return (
    <>
      <Modal
        open={!confirmDelete}
        onClose={onClose}
        title="Editar pago"
        description={`${formatCurrency(payment.amount, currency)} del ${formatDate(payment.date)}`}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Monto" required>
              <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FormField>
            <FormField label="Fecha de pago" required>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Referencia">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </FormField>
            <FormField label="Método">
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
          <p className="text-xs text-dark/55">
            {covered.length > 0
              ? `Cubre ${covered.length === 1 ? "la sesión" : "las sesiones"} del ${covered.map((s) => formatDate(s.date)).join(", ")}.`
              : "No está aplicado a ninguna sesión, por eso no cuenta como cobrado. Elimínalo y regístralo de nuevo eligiendo sus sesiones."}
          </p>
          {error ? <p className="text-sm text-orange-accent">{error}</p> : null}
          <div className="mt-2 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              Eliminar pago
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar cambios</Button>
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmModal
        open={confirmDelete}
        title="¿Eliminar este pago?"
        message={`Se eliminará el pago de ${formatCurrency(payment.amount, currency)} del ${formatDate(payment.date)}. Las sesiones que cubría volverán a quedar como pendientes.`}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deletePayment(payment.id);
          onClose();
        }}
      />
    </>
  );
}
