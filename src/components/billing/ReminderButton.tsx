"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useClinicData } from "@/components/providers/ClinicDataProvider";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { buildReminderMessage, pendingSessions, whatsappNumber, whatsappUrl } from "@/lib/reminders";
import type { Patient } from "@/lib/types";

/**
 * Recordatorio de pago por WhatsApp: muestra el mensaje armado con las
 * sesiones pendientes para revisarlo o editarlo, y abre WhatsApp con el
 * texto listo. Quien envía es siempre la persona.
 */
export function ReminderButton({
  patient,
  compact = false,
  ...buttonProps
}: { patient: Patient; compact?: boolean } & ButtonProps) {
  const { sessions, payments, profile } = useClinicData();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const pending = pendingSessions(patient.id, sessions, payments);
  const total = pending.reduce((s, p) => s + p.pending, 0);
  if (pending.length === 0) return null;
  const hasNumber = Boolean(whatsappNumber(patient.phone));

  function start() {
    setMessage(buildReminderMessage(patient, pending, profile));
    setCopied(false);
    setOpen(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      {compact ? (
        <button type="button" onClick={start} className="text-xs text-blue-accent hover:underline">
          Recordar por WhatsApp
        </button>
      ) : (
        <Button variant="secondary" onClick={start} {...buttonProps}>
          Recordatorio de pago
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Recordatorio para ${patient.name}`}
        description={`${pending.length} ${pending.length === 1 ? "sesión pendiente" : "sesiones pendientes"} por ${formatCurrency(total, patient.currency)}. Revisa el mensaje antes de enviarlo.`}
      >
        <div className="flex flex-col gap-4">
          <FormField label="Mensaje" htmlFor="reminder-text">
            <Textarea
              id="reminder-text"
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </FormField>
          {!hasNumber ? (
            <p className="text-xs text-dark/55">
              {patient.name} no tiene teléfono registrado: WhatsApp te pedirá elegir el contacto. Agrégalo con
              “Editar paciente” para abrir su chat directo.
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={copy}>
              {copied ? "Copiado" : "Copiar mensaje"}
            </Button>
            <a
              href={whatsappUrl(patient.phone, message)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded bg-blue-accent px-4 text-sm font-medium text-background hover:bg-blue-accent/90"
              )}
            >
              Abrir WhatsApp
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
