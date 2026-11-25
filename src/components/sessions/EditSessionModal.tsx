"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { attendanceOf, attendancePatch, isCharged } from "@/lib/attendance";
import { formatDate } from "@/lib/format";
import { attendanceLabels, type Attendance, type Session } from "@/lib/types";

/** Corrige la fecha, el costo, la asistencia o la nota de una sesión, o la elimina. */
export function EditSessionModal({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const { updateSession, deleteSession, payments, profile } = useClinicData();
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [attendance, setAttendance] = useState<Attendance>("asistio");
  const [listPrice, setListPrice] = useState<number | undefined>(undefined);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!session) return;
    setDate(session.date);
    setAmount(String(session.amount));
    setAttendance(attendanceOf(session));
    setListPrice(session.listPrice);
    setNote(session.note ?? "");
    setError(null);
  }, [session]);

  if (!session) return null;
  const coveringPayments = payments.filter((p) => p.sessionIds.includes(session.id));

  function handleSave() {
    const amountNum = Number(amount);
    if (!date) {
      setError("Ingresa la fecha de la sesión.");
      return;
    }
    if (amount === "" || !Number.isFinite(amountNum) || amountNum < 0) {
      setError("Ingresa un costo válido (0 si fue gratuita).");
      return;
    }
    updateSession(session!.id, {
      date,
      amount: amountNum,
      attendance: attendance === "asistio" && !session!.attendance ? undefined : attendance,
      listPrice: amountNum === 0 ? listPrice : undefined,
      note: note.trim() || undefined,
    });
    onClose();
  }

  return (
    <>
      <Modal open={!confirmDelete} onClose={onClose} title="Editar sesión" description={`Sesión del ${formatDate(session.date)}`}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Fecha" required hint="Cambiar la fecha la mueve al mes correspondiente.">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Costo de la sesión" required>
              <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FormField>
          </div>
          <FormField
            label="Asistencia"
            hint={
              isCharged(attendance, profile)
                ? "Se cobra la sesión."
                : "No se cobra: queda en $0 y se guarda su costo por si lo corriges después."
            }
          >
            <Select
              value={attendance}
              onChange={(e) => {
                const next = e.target.value as Attendance;
                const patch = attendancePatch({ amount: Number(amount) || 0, listPrice }, next, profile);
                setAttendance(next);
                setAmount(String(patch.amount));
                setListPrice(patch.listPrice);
              }}
            >
              {Object.entries(attendanceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Nota (opcional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          {error ? <p className="text-sm text-orange-accent">{error}</p> : null}
          <div className="mt-2 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              Eliminar sesión
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
        title="¿Eliminar esta sesión?"
        message={
          coveringPayments.length > 0
            ? `La sesión del ${formatDate(session.date)} tiene ${coveringPayments.length === 1 ? "un pago aplicado" : `${coveringPayments.length} pagos aplicados`}. El pago se conserva, pero esa parte quedará "sin aplicar" y aparecerá en Revisión para que la reasignes o la elimines.`
            : `Se eliminará la sesión del ${formatDate(session.date)}.`
        }
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          deleteSession(session.id);
          onClose();
        }}
      />
    </>
  );
}
